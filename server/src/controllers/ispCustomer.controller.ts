import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated, sendDeleted } from '../utils/apiResponse';
import customerService from '../services/customer.service';
import routerLogService from '../services/routerLog.service';
import storageService from '../services/storage.service';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';

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

// Quick diagnostics
const restartConnection = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.restartConnection(req.params.customerId as string);
  return sendSuccess(res, result, result.message, undefined, (req as any).requestId);
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.resetPPPoEPassword(req.params.customerId as string, req.body.newPassword, req.body.sendSms);
  return sendSuccess(res, result, 'Password reset successfully', undefined, (req as any).requestId);
});

const checkRouter = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.checkRouterHealth(req.params.customerId as string);
  return sendSuccess(res, result, result.success ? 'Router is online' : 'Router is offline', undefined, (req as any).requestId);
});

const getDetailedConnection = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.getDetailedConnectionInfo(req.params.customerId as string);
  return sendSuccess(res, result, 'Connection details retrieved', undefined, (req as any).requestId);
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await customerService.sendMessageToCustomer(req.params.customerId as string, req.body.channel, req.body.message, req.body.subject);
  return sendSuccess(res, result, 'Message sent', undefined, (req as any).requestId);
});

// ─── Document Uploads ──────────────────────────────────────────

const uploadDocuments = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.params.customerId as string;
  const customer = await prisma.ispCustomer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (!files || Object.keys(files).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No files uploaded');
  }

  const folder = `customers/${customerId}`;
  const updateData: Record<string, string> = {};

  if (files.nidFront?.[0]) {
    if (customer.nidFrontUrl) storageService.remove(customer.nidFrontUrl);
    updateData.nidFrontUrl = storageService.upload(files.nidFront[0], folder);
  }
  if (files.nidBack?.[0]) {
    if (customer.nidBackUrl) storageService.remove(customer.nidBackUrl);
    updateData.nidBackUrl = storageService.upload(files.nidBack[0], folder);
  }
  if (files.agreement?.[0]) {
    if (customer.agreementUrl) storageService.remove(customer.agreementUrl);
    updateData.agreementUrl = storageService.upload(files.agreement[0], folder);
  }

  const updated = await prisma.ispCustomer.update({ where: { id: customerId }, data: updateData });
  return sendSuccess(res, { nidFrontUrl: updated.nidFrontUrl, nidBackUrl: updated.nidBackUrl, agreementUrl: updated.agreementUrl }, 'Documents uploaded');
});

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.params.customerId as string;
  const customer = await prisma.ispCustomer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');

  if ((customer as any).profileImageUrl) storageService.remove((customer as any).profileImageUrl);
  const url = storageService.upload(req.file, `customers/${customerId}`);

  await prisma.ispCustomer.update({ where: { id: customerId }, data: { profileImageUrl: url } as any });
  return sendSuccess(res, { profileImageUrl: url }, 'Profile image uploaded');
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.params.customerId as string;
  const field = req.params.field as string;
  const allowedFields = ['nidFrontUrl', 'nidBackUrl', 'agreementUrl', 'profileImageUrl'];
  if (!allowedFields.includes(field)) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid document field');

  const customer = await prisma.ispCustomer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');

  const currentUrl = (customer as any)[field];
  if (currentUrl) storageService.remove(currentUrl);

  await prisma.ispCustomer.update({ where: { id: customerId }, data: { [field]: null } as any });
  return sendSuccess(res, null, 'Document removed');
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
  restartConnection,
  resetPassword,
  checkRouter,
  getDetailedConnection,
  sendMessage,
  uploadDocuments,
  uploadProfileImage,
  deleteDocument,
};
