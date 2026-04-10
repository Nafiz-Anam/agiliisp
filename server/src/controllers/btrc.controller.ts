import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import btrcService from '../services/btrc.service';

const getSubscriberReport = catchAsync(async (req: Request, res: Response) => {
  const report = await btrcService.getSubscriberReport();
  return sendSuccess(res, { report }, 'Subscriber report retrieved', undefined, (req as any).requestId);
});

const getBandwidthReport = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const report = await btrcService.getBandwidthReport(startDate, endDate);
  return sendSuccess(res, { report }, 'Bandwidth report retrieved', undefined, (req as any).requestId);
});

const getConnectionLogReport = catchAsync(async (req: Request, res: Response) => {
  const result: any = await btrcService.getConnectionLogReport(req.query as any);
  return sendSuccess(res, { report: result.data }, 'Connection log report retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

export default { getSubscriberReport, getBandwidthReport, getConnectionLogReport };
