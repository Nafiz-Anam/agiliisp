import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated, sendDeleted } from '../utils/apiResponse';
import resellerService from '../services/reseller.service';

const createReseller = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const reseller = await resellerService.createReseller(req.body, userId);
  return sendCreated(res, { reseller }, 'Reseller created successfully', (req as any).requestId);
});

const getResellers = catchAsync(async (req: Request, res: Response) => {
  const result: any = await resellerService.getResellers(req.query as any);
  return sendSuccess(
    res,
    { resellers: result.data },
    'Resellers retrieved successfully',
    undefined,
    (req as any).requestId,
    {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
      totalResults: result.meta.total,
      hasNext: result.meta.page < result.meta.totalPages,
      hasPrev: result.meta.page > 1,
    }
  );
});

const getResellerById = catchAsync(async (req: Request, res: Response) => {
  const reseller = await resellerService.getResellerById(req.params.resellerId as string);
  return sendSuccess(res, { reseller }, 'Reseller retrieved successfully', undefined, (req as any).requestId);
});

const updateReseller = catchAsync(async (req: Request, res: Response) => {
  const reseller = await resellerService.updateResellerById(req.params.resellerId as string, req.body);
  return sendUpdated(res, { reseller }, 'Reseller updated successfully', (req as any).requestId);
});

const deleteReseller = catchAsync(async (req: Request, res: Response) => {
  await resellerService.deleteResellerById(req.params.resellerId as string);
  return sendDeleted(res, 'Reseller deleted successfully', (req as any).requestId);
});

export default { createReseller, getResellers, getResellerById, updateReseller, deleteReseller };
