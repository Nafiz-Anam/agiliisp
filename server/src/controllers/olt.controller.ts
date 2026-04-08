import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess, sendCreated, sendDeleted } from '../utils/apiResponse';
import oltService from '../services/olt.service';
import prisma from '../client';

const getOlts = catchAsync(async (req: Request, res: Response) => {
  const result = await oltService.getOlts(req.query as any);
  return sendSuccess(
    res,
    { olts: result.data },
    'OLTs retrieved successfully',
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

const getOltById = catchAsync(async (req: Request, res: Response) => {
  const olt = await oltService.getOltById(req.params.oltId as string);
  return sendSuccess(res, olt, 'OLT retrieved successfully', undefined, (req as any).requestId);
});

const createOlt = catchAsync(async (req: Request, res: Response) => {
  const olt = await oltService.createOlt(req.body);
  return sendCreated(res, { olt }, 'OLT created successfully', (req as any).requestId);
});

const updateOlt = catchAsync(async (req: Request, res: Response) => {
  const olt = await oltService.updateOlt(req.params.oltId as string, req.body);
  return sendSuccess(res, { olt }, 'OLT updated successfully', undefined, (req as any).requestId);
});

const deleteOlt = catchAsync(async (req: Request, res: Response) => {
  await oltService.deleteOlt(req.params.oltId as string);
  return sendDeleted(res, 'OLT deleted successfully', (req as any).requestId);
});

const approveOlt = catchAsync(async (req: Request, res: Response) => {
  const olt = await oltService.approveOlt(req.params.oltId as string);
  return sendSuccess(res, { olt }, 'OLT approved successfully', undefined, (req as any).requestId);
});

// Dashboard & Monitoring
const getOltDashboard = catchAsync(async (req: Request, res: Response) => {
  const dashboard = await oltService.getOltDashboard();
  return sendSuccess(res, dashboard, 'OLT dashboard retrieved successfully', undefined, (req as any).requestId);
});

const getOltStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await oltService.getOltStats(req.params.oltId as string);
  return sendSuccess(res, stats, 'OLT stats retrieved successfully', undefined, (req as any).requestId);
});

const getOltAlerts = catchAsync(async (req: Request, res: Response) => {
  const alerts = await oltService.getOltAlerts(req.params.oltId as string, req.query as any);
  return sendSuccess(res, { alerts }, 'OLT alerts retrieved successfully', undefined, (req as any).requestId);
});

const getSignalHistory = catchAsync(async (req: Request, res: Response) => {
  const history = await oltService.getSignalHistory(req.params.oltId as string, req.query as any);
  return sendSuccess(res, { history }, 'Signal history retrieved successfully', undefined, (req as any).requestId);
});

const getTrafficStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await oltService.getTrafficStats(req.params.oltId as string, req.query as any);
  return sendSuccess(res, { stats }, 'Traffic stats retrieved successfully', undefined, (req as any).requestId);
});

// Device Management
const syncOlt = catchAsync(async (req: Request, res: Response) => {
  const result = await oltService.syncOlt(req.params.oltId as string);
  return sendSuccess(res, result, 'OLT synced successfully', undefined, (req as any).requestId);
});

const testConnection = catchAsync(async (req: Request, res: Response) => {
  const result = await oltService.testConnection(req.params.oltId as string);
  return sendSuccess(res, result, 'Connection test completed', undefined, (req as any).requestId);
});

const rebootOlt = catchAsync(async (req: Request, res: Response) => {
  const result = await oltService.rebootOlt(req.params.oltId as string);
  return sendSuccess(res, result, 'OLT reboot initiated', undefined, (req as any).requestId);
});

const getOltConfiguration = catchAsync(async (req: Request, res: Response) => {
  const config = await oltService.getOltConfiguration(req.params.oltId as string);
  return sendSuccess(res, { config }, 'OLT configuration retrieved', undefined, (req as any).requestId);
});

// ONU Management
const getOnusByOlt = catchAsync(async (req: Request, res: Response) => {
  const result = await oltService.getOnusByOlt(req.params.oltId as string, req.query as any);
  return sendSuccess(
    res,
    { onus: result.data },
    'ONUs retrieved successfully',
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

const provisionOnu = catchAsync(async (req: Request, res: Response) => {
  const onu = await oltService.provisionOnu(req.params.oltId as string, req.body);
  return sendCreated(res, { onu }, 'ONU provisioned successfully', (req as any).requestId);
});

const deprovisionOnu = catchAsync(async (req: Request, res: Response) => {
  await oltService.deprovisionOnu(req.params.oltId as string, req.params.onuId as string);
  return sendDeleted(res, 'ONU deprovisioned successfully', (req as any).requestId);
});

const getOnuDetails = catchAsync(async (req: Request, res: Response) => {
  const onu = await oltService.getOnuDetails(req.params.oltId as string, req.params.onuId as string);
  return sendSuccess(res, onu, 'ONU details retrieved successfully', undefined, (req as any).requestId);
});

// Port Management
const getOltPorts = catchAsync(async (req: Request, res: Response) => {
  const ports = await oltService.getOltPorts(req.params.oltId as string, req.query as any);
  return sendSuccess(res, { ports }, 'OLT ports retrieved successfully', undefined, (req as any).requestId);
});

const enablePort = catchAsync(async (req: Request, res: Response) => {
  const port = await oltService.enablePort(req.params.oltId as string, req.params.portId as string);
  return sendSuccess(res, { port }, 'Port enabled successfully', undefined, (req as any).requestId);
});

const disablePort = catchAsync(async (req: Request, res: Response) => {
  const port = await oltService.disablePort(req.params.oltId as string, req.params.portId as string);
  return sendSuccess(res, { port }, 'Port disabled successfully', undefined, (req as any).requestId);
});

const getPortDetails = catchAsync(async (req: Request, res: Response) => {
  const port = await oltService.getPortDetails(req.params.oltId as string, req.params.portId as string);
  return sendSuccess(res, port, 'Port details retrieved successfully', undefined, (req as any).requestId);
});

// Maintenance
const getMaintenanceSchedule = catchAsync(async (req: Request, res: Response) => {
  const schedules = await oltService.getMaintenanceSchedule(req.params.oltId as string, req.query as any);
  return sendSuccess(res, { schedules }, 'Maintenance schedule retrieved', undefined, (req as any).requestId);
});

const createMaintenanceSchedule = catchAsync(async (req: Request, res: Response) => {
  const schedule = await oltService.createMaintenanceSchedule(req.params.oltId as string, req.body);
  return sendCreated(res, { schedule }, 'Maintenance schedule created', (req as any).requestId);
});

export default {
  // Core OLT Management
  getOlts,
  getOltById,
  createOlt,
  updateOlt,
  deleteOlt,
  approveOlt,
  
  // Dashboard & Monitoring
  getOltDashboard,
  getOltStats,
  getOltAlerts,
  getSignalHistory,
  getTrafficStats,
  
  // Device Management
  syncOlt,
  testConnection,
  rebootOlt,
  getOltConfiguration,
  
  // ONU Management
  getOnusByOlt,
  provisionOnu,
  deprovisionOnu,
  getOnuDetails,
  
  // Port Management
  getOltPorts,
  enablePort,
  disablePort,
  getPortDetails,
  
  // Maintenance
  getMaintenanceSchedule,
  createMaintenanceSchedule,
};
