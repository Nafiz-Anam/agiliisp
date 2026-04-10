import { Request, Response } from 'express';
import catchAsync from '../utils/catchAsync';
import { sendSuccess } from '../utils/apiResponse';
import monitoringService from '../services/monitoring.service';
import mikrotik from '../services/mikrotik.service';
import prisma from '../client';

const db = prisma as any;

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

// ── Live Bandwidth (aggregated from latest SNMP interface metrics) ──
const getLiveBandwidth = catchAsync(async (req: Request, res: Response) => {
  const hours = Number(req.query.hours) || 1;
  const since = new Date(Date.now() - hours * 3600000);

  // Get latest interface byte metrics for all routers
  const metrics = await db.deviceMetric.findMany({
    where: {
      metricType: { in: ['INTERFACE_IN_BYTES', 'INTERFACE_OUT_BYTES'] },
      collectedAt: { gte: since },
    },
    orderBy: { collectedAt: 'asc' },
    select: { deviceId: true, metricType: true, value: true, collectedAt: true },
  });

  // Aggregate into time-series buckets (per minute)
  const buckets: Record<string, { bytesIn: number; bytesOut: number }> = {};
  for (const m of metrics) {
    const key = new Date(m.collectedAt).toISOString().slice(0, 16); // per-minute
    if (!buckets[key]) buckets[key] = { bytesIn: 0, bytesOut: 0 };
    if (m.metricType === 'INTERFACE_IN_BYTES') buckets[key].bytesIn += Number(m.value);
    else buckets[key].bytesOut += Number(m.value);
  }

  const timeSeries = Object.entries(buckets)
    .map(([time, data]) => ({ time, ...data }))
    .sort((a, b) => a.time.localeCompare(b.time));

  return sendSuccess(res, { timeSeries }, 'Live bandwidth data', undefined, (req as any).requestId);
});

// ── Active Connections across all routers ──
const getActiveConnections = catchAsync(async (req: Request, res: Response) => {
  const routerId = req.query.routerId as string | undefined;

  // Get routers to poll
  const routers = routerId
    ? await prisma.router.findMany({ where: { id: routerId, status: 'ONLINE' } })
    : await prisma.router.findMany({ where: { status: 'ONLINE' } });

  const allConnections: any[] = [];

  for (const router of routers) {
    try {
      const connections = await mikrotik.getActiveConnections(router.id);
      for (const conn of connections) {
        // Try to match with customer
        const customer = await prisma.ispCustomer.findFirst({
          where: { username: conn.name },
          select: { id: true, fullName: true, username: true, phone: true, package: { select: { name: true, downloadSpeed: true, uploadSpeed: true } } },
        });

        allConnections.push({
          connectionId: conn['.id'],
          routerId: router.id,
          routerName: router.name,
          username: conn.name,
          ipAddress: conn.address,
          callerId: conn.callerId,
          uptime: conn.uptime,
          service: conn.service,
          customerId: customer?.id || null,
          customerName: customer?.fullName || null,
          customerPhone: customer?.phone || null,
          packageName: customer?.package?.name || null,
          downloadSpeed: customer?.package?.downloadSpeed || null,
          uploadSpeed: customer?.package?.uploadSpeed || null,
        });
      }
    } catch {
      // Router unreachable — skip silently
    }
  }

  return sendSuccess(res, {
    connections: allConnections,
    total: allConnections.length,
    routersPolled: routers.length,
  }, 'Active connections retrieved', undefined, (req as any).requestId);
});

// ── Per-customer traffic history ──
const getCustomerTraffic = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.params.customerId as string;
  const period = (req.query.period as string) || 'DAILY';
  const days = Number(req.query.days) || 30;
  const since = new Date(Date.now() - days * 86400000);

  const stats = await prisma.trafficStat.findMany({
    where: {
      customerId,
      periodType: period as any,
      periodStart: { gte: since },
    },
    orderBy: { periodStart: 'asc' },
    select: {
      periodStart: true,
      totalBytesIn: true,
      totalBytesOut: true,
      peakDownloadSpeed: true,
      peakUploadSpeed: true,
    },
  });

  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true, username: true, ipAddress: true, status: true, package: { select: { name: true, downloadSpeed: true, uploadSpeed: true } } },
  });

  return sendSuccess(res, {
    customer,
    stats: stats.map(s => ({
      date: s.periodStart,
      bytesIn: Number(s.totalBytesIn),
      bytesOut: Number(s.totalBytesOut),
      peakDown: Number(s.peakDownloadSpeed || 0),
      peakUp: Number(s.peakUploadSpeed || 0),
    })),
  }, 'Customer traffic retrieved', undefined, (req as any).requestId);
});

// ── Disconnect active user ──
const disconnectUser = catchAsync(async (req: Request, res: Response) => {
  const { routerId, connectionId } = req.body;
  await mikrotik.disconnectActiveUser(routerId, connectionId);
  return sendSuccess(res, null, 'User disconnected', undefined, (req as any).requestId);
});

const getTopology = catchAsync(async (req: Request, res: Response) => {
  const data = await monitoringService.getTopologyData();
  return sendSuccess(res, data, 'Topology data', undefined, (req as any).requestId);
});

export default {
  getOverview, getDeviceMetrics, getAlerts, acknowledgeAlert, resolveAlert,
  getConfig, updateConfig, triggerPoll,
  getLiveBandwidth, getActiveConnections, getCustomerTraffic, disconnectUser,
  getTopology,
};
