import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import zoneService from '../services/zone.service';

const createZone = catchAsync(async (req: Request, res: Response) => {
  const zone = await zoneService.createZone(req.body);
  return sendCreated(res, { zone }, 'Zone created', (req as any).requestId);
});

const getZones = catchAsync(async (req: Request, res: Response) => {
  const zones = await zoneService.getZones(req.query as any);
  return sendSuccess(res, { zones }, 'Zones retrieved', undefined, (req as any).requestId);
});

const getZoneTree = catchAsync(async (req: Request, res: Response) => {
  const tree = await zoneService.getZoneTree();
  return sendSuccess(res, { tree }, 'Zone tree retrieved', undefined, (req as any).requestId);
});

const getZoneById = catchAsync(async (req: Request, res: Response) => {
  const zone = await zoneService.getZoneById(req.params.zoneId as string);
  return sendSuccess(res, { zone }, 'Zone retrieved', undefined, (req as any).requestId);
});

const updateZone = catchAsync(async (req: Request, res: Response) => {
  const zone = await zoneService.updateZone(req.params.zoneId as string, req.body);
  return sendSuccess(res, { zone }, 'Zone updated', undefined, (req as any).requestId);
});

const deleteZone = catchAsync(async (req: Request, res: Response) => {
  await zoneService.deleteZone(req.params.zoneId as string);
  return sendSuccess(res, null, 'Zone deleted', undefined, (req as any).requestId);
});

export default { createZone, getZones, getZoneTree, getZoneById, updateZone, deleteZone };
