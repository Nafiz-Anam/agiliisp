import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import supplierService from '../services/supplier.service';

const createSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplier = await supplierService.createSupplier(req.body);
  return sendCreated(res, { supplier }, 'Supplier created', (req as any).requestId);
});

const getSuppliers = catchAsync(async (req: Request, res: Response) => {
  const result: any = await supplierService.getSuppliers(req.query as any);
  return sendSuccess(res, { suppliers: result.data }, 'Suppliers retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getSupplierById = catchAsync(async (req: Request, res: Response) => {
  const supplier = await supplierService.getSupplierById(req.params.supplierId as string);
  return sendSuccess(res, { supplier }, 'Supplier retrieved', undefined, (req as any).requestId);
});

const updateSupplier = catchAsync(async (req: Request, res: Response) => {
  const supplier = await supplierService.updateSupplier(req.params.supplierId as string, req.body);
  return sendSuccess(res, { supplier }, 'Supplier updated', undefined, (req as any).requestId);
});

const deleteSupplier = catchAsync(async (req: Request, res: Response) => {
  await supplierService.deleteSupplier(req.params.supplierId as string);
  return sendSuccess(res, null, 'Supplier deleted', undefined, (req as any).requestId);
});

export default { createSupplier, getSuppliers, getSupplierById, updateSupplier, deleteSupplier };
