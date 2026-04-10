import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import payoutService from '../services/payout.service';

const requestPayout = catchAsync(async (req: Request, res: Response) => {
  const payout = await payoutService.requestPayout(
    req.params.resellerId as string, req.body.amount, req.body.payoutMethod, req.body.accountDetails, req.body.notes,
  );
  return sendCreated(res, { payout }, 'Payout requested', (req as any).requestId);
});

const getPayouts = catchAsync(async (req: Request, res: Response) => {
  const result: any = await payoutService.getPayouts(req.query as any);
  return sendSuccess(res, { payouts: result.data }, 'Payouts retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getResellerPayouts = catchAsync(async (req: Request, res: Response) => {
  const result: any = await payoutService.getPayouts({ resellerId: req.params.resellerId as string, ...req.query as any });
  return sendSuccess(res, { payouts: result.data }, 'Payouts retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const approvePayout = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const payout = await payoutService.approvePayout(req.params.payoutId as string, userId, req.body.referenceNumber);
  return sendSuccess(res, { payout }, 'Payout approved', undefined, (req as any).requestId);
});

const rejectPayout = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const payout = await payoutService.rejectPayout(req.params.payoutId as string, userId, req.body.rejectionReason);
  return sendSuccess(res, { payout }, 'Payout rejected', undefined, (req as any).requestId);
});

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const summary = await payoutService.getPayoutSummary(req.params.resellerId as string);
  return sendSuccess(res, { summary }, 'Payout summary', undefined, (req as any).requestId);
});

export default { requestPayout, getPayouts, getResellerPayouts, approvePayout, rejectPayout, getSummary };
