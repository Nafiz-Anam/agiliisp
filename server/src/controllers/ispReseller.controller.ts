import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated, sendDeleted } from '../utils/apiResponse';
import resellerService from '../services/reseller.service';
import storageService from '../services/storage.service';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';

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

const getHierarchyTree = catchAsync(async (req: Request, res: Response) => {
  const tree = await resellerService.getResellerHierarchyTree(req.query.rootId as string | undefined);
  return sendSuccess(res, { tree }, 'Hierarchy tree', undefined, (req as any).requestId);
});

const getChildren = catchAsync(async (req: Request, res: Response) => {
  const children = await resellerService.getChildResellers(req.params.resellerId as string);
  return sendSuccess(res, { children }, 'Child resellers', undefined, (req as any).requestId);
});

const getResellersSummary = catchAsync(async (req: Request, res: Response) => {
  const resellers = await resellerService.getResellersSummary();
  return sendSuccess(res, { resellers }, 'Resellers summary', undefined, (req as any).requestId);
});

// ─── Document Uploads ──────────────────────────────────────────

const uploadDocuments = catchAsync(async (req: Request, res: Response) => {
  const resellerId = req.params.resellerId as string;
  const reseller = await prisma.reseller.findUnique({ where: { id: resellerId } });
  if (!reseller) throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  if (!files || Object.keys(files).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No files uploaded');
  }

  const folder = `resellers/${resellerId}`;
  const updateData: Record<string, string> = {};

  if (files.businessRegistration?.[0]) {
    if ((reseller as any).businessRegistrationUrl) storageService.remove((reseller as any).businessRegistrationUrl);
    updateData.businessRegistrationUrl = storageService.upload(files.businessRegistration[0], folder);
  }
  if (files.tinDocument?.[0]) {
    if ((reseller as any).tinDocumentUrl) storageService.remove((reseller as any).tinDocumentUrl);
    updateData.tinDocumentUrl = storageService.upload(files.tinDocument[0], folder);
  }

  const updated = await prisma.reseller.update({ where: { id: resellerId }, data: updateData as any });
  return sendSuccess(res, { businessRegistrationUrl: (updated as any).businessRegistrationUrl, tinDocumentUrl: (updated as any).tinDocumentUrl }, 'Documents uploaded');
});

const uploadLogo = catchAsync(async (req: Request, res: Response) => {
  const resellerId = req.params.resellerId as string;
  const reseller = await prisma.reseller.findUnique({ where: { id: resellerId } });
  if (!reseller) throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');
  if (!req.file) throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');

  if (reseller.companyLogo) storageService.remove(reseller.companyLogo);
  const url = storageService.upload(req.file, `resellers/${resellerId}`);

  await prisma.reseller.update({ where: { id: resellerId }, data: { companyLogo: url } });
  return sendSuccess(res, { companyLogo: url }, 'Logo uploaded');
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const resellerId = req.params.resellerId as string;
  const field = req.params.field as string;
  const allowedFields = ['businessRegistrationUrl', 'tinDocumentUrl', 'companyLogo'];
  if (!allowedFields.includes(field)) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid document field');

  const reseller = await prisma.reseller.findUnique({ where: { id: resellerId } });
  if (!reseller) throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');

  const currentUrl = (reseller as any)[field];
  if (currentUrl) storageService.remove(currentUrl);

  await prisma.reseller.update({ where: { id: resellerId }, data: { [field]: null } as any });
  return sendSuccess(res, null, 'Document removed');
});

export default { createReseller, getResellers, getResellerById, updateReseller, deleteReseller, getHierarchyTree, getChildren, getResellersSummary, uploadDocuments, uploadLogo, deleteDocument };
