import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import oltService from '../services/olt.service';

const getOltDashboard = catchAsync(async (req: Request, res: Response) => {
  const dashboard = await oltService.getOltDashboard();
  return sendSuccess(res, dashboard, 'OLT dashboard retrieved successfully', undefined, (req as any).requestId);
});

const getOltSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await oltService.getOltSummary();
  return sendSuccess(res, summary, 'OLT summary retrieved successfully', undefined, (req as any).requestId);
});

const getActiveConnections = catchAsync(async (req: Request, res: Response) => {
  const connections = await oltService.getActiveConnections();
  return sendSuccess(res, { connections }, 'Active connections retrieved', undefined, (req as any).requestId);
});

export default {
  getOltDashboard,
  getOltSummary,
  getActiveConnections,
};
