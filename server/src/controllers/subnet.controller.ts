import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import subnetService from '../services/subnet.service';

const createPool = catchAsync(async (req: Request, res: Response) => {
  const pool = await subnetService.createPool(req.body);
  return sendCreated(res, { pool }, 'IP Pool created', (req as any).requestId);
});

const getPools = catchAsync(async (req: Request, res: Response) => {
  const pools = await subnetService.getPools(req.query as any);
  return sendSuccess(res, { pools }, 'IP Pools retrieved', undefined, (req as any).requestId);
});

const getPoolById = catchAsync(async (req: Request, res: Response) => {
  const pool = await subnetService.getPoolById(req.params.poolId as string);
  return sendSuccess(res, { pool }, 'IP Pool retrieved', undefined, (req as any).requestId);
});

const updatePool = catchAsync(async (req: Request, res: Response) => {
  const pool = await subnetService.updatePool(req.params.poolId as string, req.body);
  return sendSuccess(res, { pool }, 'IP Pool updated', undefined, (req as any).requestId);
});

const deletePool = catchAsync(async (req: Request, res: Response) => {
  await subnetService.deletePool(req.params.poolId as string);
  return sendSuccess(res, null, 'IP Pool deleted', undefined, (req as any).requestId);
});

const getNextAvailableIp = catchAsync(async (req: Request, res: Response) => {
  const ip = await subnetService.getNextAvailableIp(req.params.poolId as string);
  return sendSuccess(res, { ipAddress: ip }, ip ? 'Next available IP' : 'No available IPs', undefined, (req as any).requestId);
});

const assignIp = catchAsync(async (req: Request, res: Response) => {
  const result = await subnetService.assignIp(req.params.poolId as string, req.body);
  return sendCreated(res, result, 'IP assigned', (req as any).requestId);
});

const releaseIp = catchAsync(async (req: Request, res: Response) => {
  await subnetService.releaseIp(req.params.assignmentId as string);
  return sendSuccess(res, null, 'IP released', undefined, (req as any).requestId);
});

const getPoolAssignments = catchAsync(async (req: Request, res: Response) => {
  const result: any = await subnetService.getPoolAssignments(req.params.poolId as string, req.query as any);
  return sendSuccess(res, { assignments: result.data }, 'Assignments retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const getNetworkInfo = catchAsync(async (req: Request, res: Response) => {
  const { network, cidr } = req.query as any;
  const info = subnetService.getNetworkInfo(network, Number(cidr));
  return sendSuccess(res, { info }, 'Network info', undefined, (req as any).requestId);
});

export default { createPool, getPools, getPoolById, updatePool, deletePool, getNextAvailableIp, assignIp, releaseIp, getPoolAssignments, getNetworkInfo };
