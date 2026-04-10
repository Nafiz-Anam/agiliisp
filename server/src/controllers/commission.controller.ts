import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import commissionService from '../services/commission.service';

const getHistory = catchAsync(async (req: Request, res: Response) => {
  const result: any = await commissionService.getCommissionHistory(req.params.resellerId as string, req.query as any);
  return sendSuccess(res, { records: result.data }, 'Commission history', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await commissionService.getCommissionSummary(req.params.resellerId as string);
  return sendSuccess(res, { summary }, 'Commission summary', undefined, (req as any).requestId);
});

export default { getHistory, getSummary };
