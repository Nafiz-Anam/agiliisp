import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendUpdated, sendDeleted } from '../utils/apiResponse';
import packageService from '../services/package.service';

const createPackage = catchAsync(async (req: Request, res: Response) => {
  const { routerId, ...rest } = req.body;
  const packageData = {
    ...rest,
    router: { connect: { id: routerId } },
  };
  const pkg = await packageService.createPackage(packageData);
  return sendCreated(res, { package: pkg }, 'Package created successfully', (req as any).requestId);
});

const getPackages = catchAsync(async (req: Request, res: Response) => {
  const result: any = await packageService.getPackages(req.query as any);
  return sendSuccess(
    res,
    { packages: result.data },
    'Packages retrieved successfully',
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

const getPackageById = catchAsync(async (req: Request, res: Response) => {
  const pkg = await packageService.getPackageById(req.params.packageId as string);
  return sendSuccess(res, { package: pkg }, 'Package retrieved successfully', undefined, (req as any).requestId);
});

const updatePackage = catchAsync(async (req: Request, res: Response) => {
  const pkg = await packageService.updatePackageById(req.params.packageId as string, req.body);
  return sendUpdated(res, { package: pkg }, 'Package updated successfully', (req as any).requestId);
});

const deletePackage = catchAsync(async (req: Request, res: Response) => {
  await packageService.deletePackageById(req.params.packageId as string);
  return sendDeleted(res, 'Package deleted successfully', (req as any).requestId);
});

export default { createPackage, getPackages, getPackageById, updatePackage, deletePackage };
