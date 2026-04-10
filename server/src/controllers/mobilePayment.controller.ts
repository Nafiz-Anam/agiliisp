import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import mobilePaymentService from '../services/mobilePayment.service';

// Webhook endpoint — called by bKash/Nagad when payment is received
const webhook = catchAsync(async (req: Request, res: Response) => {
  const result = await mobilePaymentService.processIncomingPayment(req.body);
  return sendSuccess(res, result, 'Payment processed', undefined, (req as any).requestId);
});

const getMobilePayments = catchAsync(async (req: Request, res: Response) => {
  const result: any = await mobilePaymentService.getMobilePayments(req.query as any);
  return sendSuccess(res, { payments: result.data }, 'Mobile payments retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const manualMatch = catchAsync(async (req: Request, res: Response) => {
  const result = await mobilePaymentService.manualMatchPayment(req.params.paymentId as string, req.body.customerId, req.body.invoiceId);
  return sendSuccess(res, result, 'Payment matched and credited', undefined, (req as any).requestId);
});

export default { webhook, getMobilePayments, manualMatch };
