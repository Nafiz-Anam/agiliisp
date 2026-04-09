import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated, sendDeleted } from '../utils/apiResponse';
import customerService from '../services/customer.service';
import routerLogService from '../services/routerLog.service';

const createCustomer = catchAsync(async (req: Request, res: Response) => {
  const { routerId, packageId, resellerId, ...rest } = req.body;
  const customerData = {
    ...rest,
    router: { connect: { id: routerId } },
    package: { connect: { id: packageId } },
    ...(resellerId && { reseller: { connect: { id: resellerId } } }),
  };
  const customer = await customerService.createCustomer(customerData);
  return sendCreated(res, { customer }, 'Customer created successfully', (req as any).requestId);
});

const getCustomers = catchAsync(async (req: Request, res: Response) => {
  const result: any = await customerService.getCustomers(req.query as any);
  return sendSuccess(
    res,
    { customers: result.data },
    'Customers retrieved successfully',
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

const getCustomerById = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.params.customerId as string);
  return sendSuccess(res, customer, 'Customer retrieved successfully', undefined, (req as any).requestId);
});

const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomerById(req.params.customerId as string, req.body);
  return sendUpdated(res, { customer }, 'Customer updated successfully', (req as any).requestId);
});

const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  await customerService.deleteCustomerById(req.params.customerId as string);
  return sendDeleted(res, 'Customer deleted successfully', (req as any).requestId);
});

const getCustomerStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await customerService.getCustomerStats(req.params.customerId as string);
  return sendSuccess(res, stats, 'Customer stats retrieved successfully', undefined, (req as any).requestId);
});

const getConnectionStatus = catchAsync(async (req: Request, res: Response) => {
  const status = await customerService.getCustomerConnectionStatus(req.params.customerId as string);
  return sendSuccess(res, status, 'Connection status retrieved successfully', undefined, (req as any).requestId);
});

const getTrafficStats = catchAsync(async (req: Request, res: Response) => {
  const { periodType = 'DAILY', days, limit } = req.query as any;
  const effectiveDays = Number(days || limit || 30);
  const stats = await routerLogService.getCustomerTrafficStats(
    req.params.customerId as string,
    periodType as 'HOURLY' | 'DAILY' | 'MONTHLY',
    effectiveDays
  );
  return sendSuccess(res, stats, 'Traffic stats retrieved successfully', undefined, (req as any).requestId);
});

const suspendCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.suspendCustomer(req.params.customerId as string, req.body.reason);
  return sendSuccess(res, { customer }, 'Customer suspended successfully', undefined, (req as any).requestId);
});

const activateCustomer = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.activateCustomer(req.params.customerId as string);
  return sendSuccess(res, { customer }, 'Customer activated successfully', undefined, (req as any).requestId);
});

const syncToRouter = catchAsync(async (req: Request, res: Response) => {
  const customer = await customerService.syncCustomerToRouter(req.params.customerId as string);
  return sendSuccess(res, { customer }, 'Customer synced to router successfully', undefined, (req as any).requestId);
});

const bulkSuspend = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.bulkSuspend(req.body.ids, req.body.reason);
  return sendSuccess(res, result, `Bulk suspend: ${result.success} succeeded, ${result.failed} failed`, undefined, (req as any).requestId);
});

const bulkActivate = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.bulkActivate(req.body.ids);
  return sendSuccess(res, result, `Bulk activate: ${result.success} succeeded, ${result.failed} failed`, undefined, (req as any).requestId);
});

const bulkChangePackage = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.bulkChangePackage(req.body.ids, req.body.packageId);
  return sendSuccess(res, result, `Bulk package change: ${result.success} succeeded, ${result.failed} failed`, undefined, (req as any).requestId);
});

export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getConnectionStatus,
  getTrafficStats,
  suspendCustomer,
  activateCustomer,
  syncToRouter,
  bulkSuspend,
  bulkActivate,
  bulkChangePackage,
};
