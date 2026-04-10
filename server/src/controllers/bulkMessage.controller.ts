import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import bulkMessageService from '../services/bulkMessage.service';

const create = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const msg = await bulkMessageService.createBulkMessage(req.body, userId);
  return sendCreated(res, { message: msg }, 'Bulk message created', (req as any).requestId);
});

const getAll = catchAsync(async (req: Request, res: Response) => {
  const result: any = await bulkMessageService.getBulkMessages(req.query as any);
  return sendSuccess(res, { messages: result.data }, 'Bulk messages retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getById = catchAsync(async (req: Request, res: Response) => {
  const msg = await bulkMessageService.getBulkMessageById(req.params.id as string);
  return sendSuccess(res, { message: msg }, 'Bulk message retrieved', undefined, (req as any).requestId);
});

const preview = catchAsync(async (req: Request, res: Response) => {
  const result = await bulkMessageService.previewRecipients(req.body.filters);
  return sendSuccess(res, result, `${result.count} recipients match`, undefined, (req as any).requestId);
});

const send = catchAsync(async (req: Request, res: Response) => {
  // Fire and forget — processing happens in background
  bulkMessageService.sendBulkMessage(req.params.id as string).catch(() => {});
  return sendSuccess(res, null, 'Bulk message sending started', undefined, (req as any).requestId);
});

export default { create, getAll, getById, preview, send };
