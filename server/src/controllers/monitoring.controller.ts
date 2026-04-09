import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import monitoringService from '../services/monitoring.service';

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const data = await monitoringService.getMonitoringOverview();
  return sendSuccess(res, data, 'Monitoring overview retrieved', undefined, (req as any).requestId);
});

const getDeviceMetrics = catchAsync(async (req: Request, res: Response) => {
  const metrics = await monitoringService.getDeviceMetrics(req.params.deviceId as string, req.query as any);
  return sendSuccess(res, { metrics }, 'Device metrics retrieved', undefined, (req as any).requestId);
});

const getAlerts = catchAsync(async (req: Request, res: Response) => {
  const result: any = await monitoringService.getAlerts(req.query as any);
  return sendSuccess(res, { alerts: result.data }, 'Alerts retrieved', undefined, (req as any).requestId, {
    page: result.meta.page, limit: result.meta.limit, totalPages: result.meta.totalPages,
    totalResults: result.meta.total, hasNext: result.meta.page < result.meta.totalPages, hasPrev: result.meta.page > 1,
  });
});

const acknowledgeAlert = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const alert = await monitoringService.acknowledgeAlert(req.params.alertId as string, userId);
  return sendSuccess(res, { alert }, 'Alert acknowledged', undefined, (req as any).requestId);
});

const resolveAlert = catchAsync(async (req: Request, res: Response) => {
  const alert = await monitoringService.resolveAlert(req.params.alertId as string);
  return sendSuccess(res, { alert }, 'Alert resolved', undefined, (req as any).requestId);
});

const getConfig = catchAsync(async (req: Request, res: Response) => {
  const config = await monitoringService.getConfig(req.params.deviceId as string, req.query.deviceType as any || 'ROUTER');
  return sendSuccess(res, { config }, 'Config retrieved', undefined, (req as any).requestId);
});

const updateConfig = catchAsync(async (req: Request, res: Response) => {
  const { deviceType, ...data } = req.body;
  const config = await monitoringService.updateConfig(req.params.deviceId as string, deviceType, data);
  return sendSuccess(res, { config }, 'Config updated', undefined, (req as any).requestId);
});

const triggerPoll = catchAsync(async (req: Request, res: Response) => {
  await monitoringService.triggerPoll(req.params.deviceId as string, req.body.deviceType);
  return sendSuccess(res, null, 'Poll triggered', undefined, (req as any).requestId);
});

export default { getOverview, getDeviceMetrics, getAlerts, acknowledgeAlert, resolveAlert, getConfig, updateConfig, triggerPoll };
