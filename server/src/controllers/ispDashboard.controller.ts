import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import ispDashboardService from '../services/ispDashboard.service';
import prisma from '../client';

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  let stats;

  if (user?.role === 'RESELLER') {
    const reseller = await prisma.reseller.findUnique({ where: { userId: user.id } });
    if (!reseller) {
      stats = await ispDashboardService.getAdminDashboard();
    } else {
      stats = await ispDashboardService.getResellerDashboard(reseller.id);
    }
  } else {
    stats = await ispDashboardService.getAdminDashboard();
  }

  return sendSuccess(res, stats, 'Dashboard stats retrieved', undefined, (req as any).requestId);
});

const getSystemStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await ispDashboardService.getSystemStats();
  return sendSuccess(res, stats, 'System stats retrieved', undefined, (req as any).requestId);
});

export default { getDashboardStats, getSystemStats };
