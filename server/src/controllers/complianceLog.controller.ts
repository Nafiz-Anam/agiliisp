import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import complianceLogService from '../services/complianceLog.service';

const getSessionLogs = catchAsync(async (req: Request, res: Response) => {
  const result: any = await complianceLogService.getSessionLogs(req.query as any);
  return sendSuccess(res, { logs: result.data }, 'Session logs retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getNatLogs = catchAsync(async (req: Request, res: Response) => {
  const result: any = await complianceLogService.getNatLogs(req.query as any);
  return sendSuccess(res, { logs: result.data }, 'NAT logs retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getAuthLogs = catchAsync(async (req: Request, res: Response) => {
  const result: any = await complianceLogService.getAuthLogs(req.query as any);
  return sendSuccess(res, { logs: result.data }, 'Auth logs retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const lookupIp = catchAsync(async (req: Request, res: Response) => {
  const { ip, timestamp } = req.query as any;
  const result = await complianceLogService.lookupIpAtTime(ip, timestamp);
  return sendSuccess(res, result, 'IP lookup result', undefined, (req as any).requestId);
});

const exportLogs = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const csv = await complianceLogService.exportSessionLogs(startDate, endDate);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=session-logs-${startDate}-to-${endDate}.csv`);
  return res.send(csv);
});

const getStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await complianceLogService.getComplianceStats();
  return sendSuccess(res, { stats }, 'Compliance stats', undefined, (req as any).requestId);
});

export default { getSessionLogs, getNatLogs, getAuthLogs, lookupIp, exportLogs, getStats };
