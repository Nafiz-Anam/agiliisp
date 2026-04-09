import prisma from '../client';
import logger from '../config/logger';
import snmpService, { DeviceMetricData } from './snmp.service';

// Use string types and `db` cast to avoid import errors before migration runs
type MonitoredDeviceType = 'ROUTER' | 'OLT';
type MetricType = string;
const db = prisma as any;

const pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

const startAllPolling = async () => {
  try {
    // Check if monitoring tables exist (schema may not be migrated yet)
    try { await db.monitoringConfig.count(); } catch { logger.info('Monitoring tables not yet migrated — skipping SNMP polling'); return; }

    // Get all routers with SNMP configured
    const routers = await db.router.findMany({
      where: { isActive: true, snmpCommunity: { not: null } },
      select: { id: true, name: true, host: true, snmpCommunity: true, snmpVersion: true },
    });

    // Get all OLTs with SNMP configured
    const olts = await prisma.oLT.findMany({
      where: { status: { in: ['ACTIVE', 'APPROVED'] }, snmpCommunity: { not: null } },
      select: { id: true, name: true, ipAddress: true, snmpCommunity: true },
    });

    for (const router of routers) {
      await startDevicePolling(router.id, 'ROUTER');
    }
    for (const olt of olts) {
      await startDevicePolling(olt.id, 'OLT');
    }

    logger.info(`Monitoring: Started polling for ${routers.length} routers and ${olts.length} OLTs`);
  } catch (err: any) {
    logger.error(`Failed to start monitoring: ${err.message}`);
  }
};

const startDevicePolling = async (deviceId: string, deviceType: MonitoredDeviceType) => {
  const key = `${deviceType}:${deviceId}`;
  if (pollingIntervals.has(key)) return;

  // Get config or use defaults
  const config = await db.monitoringConfig.findUnique({
    where: { deviceId_deviceType: { deviceId, deviceType } },
  });
  const interval = (config?.pollingInterval || 300) * 1000; // default 5 min

  // Initial poll
  pollAndStore(deviceId, deviceType).catch(() => {});

  // Schedule recurring
  const timer = setInterval(() => {
    pollAndStore(deviceId, deviceType).catch(() => {});
  }, interval);

  pollingIntervals.set(key, timer);
};

const stopDevicePolling = (deviceId: string, deviceType: string = 'ROUTER') => {
  const key = `${deviceType}:${deviceId}`;
  const timer = pollingIntervals.get(key);
  if (timer) {
    clearInterval(timer);
    pollingIntervals.delete(key);
  }
};

const pollAndStore = async (deviceId: string, deviceType: MonitoredDeviceType) => {
  let host = '';
  let community = '';
  let version = 2;

  try {
    if (deviceType === 'ROUTER') {
      const router = await db.router.findUnique({ where: { id: deviceId } });
      if (!router || !router.snmpCommunity) return;
      host = router.host;
      community = router.snmpCommunity;
      version = router.snmpVersion;
    } else {
      const olt = await prisma.oLT.findUnique({ where: { id: deviceId } });
      if (!olt || !olt.snmpCommunity) return;
      host = olt.ipAddress;
      community = olt.snmpCommunity;
    }

    const metrics = await snmpService.pollDevice({ id: deviceId, host, snmpCommunity: community, snmpVersion: version, deviceType });

    if (metrics.length === 0) {
      // Device unreachable
      if (deviceType === 'ROUTER') {
        await prisma.router.update({ where: { id: deviceId }, data: { status: 'OFFLINE' } });
      }
      return;
    }

    // Batch insert metrics
    await db.deviceMetric.createMany({
      data: metrics.map(m => ({
        deviceId,
        deviceType,
        metricType: m.metricType as MetricType,
        value: m.value,
        unit: m.unit || null,
        interfaceName: m.interfaceName || null,
      })),
    });

    // Update device status
    const cpuMetric = metrics.find(m => m.metricType === 'CPU_USAGE');
    const memMetric = metrics.find(m => m.metricType === 'MEMORY_USAGE');
    const uptimeMetric = metrics.find(m => m.metricType === 'UPTIME');

    if (deviceType === 'ROUTER') {
      await prisma.router.update({
        where: { id: deviceId },
        data: { status: 'ONLINE', lastConnectedAt: new Date() },
      });
    } else {
      await prisma.oLT.update({
        where: { id: deviceId },
        data: {
          status: 'ACTIVE',
          cpuUsage: cpuMetric?.value || undefined,
          ramUsage: memMetric?.value || undefined,
          uptime: uptimeMetric ? BigInt(Math.floor(uptimeMetric.value)) : undefined,
          lastSyncAt: new Date(),
        },
      });
    }

    // Evaluate alerts
    await evaluateAlerts(deviceId, deviceType, metrics);
  } catch (err: any) {
    logger.error(`Poll failed for ${deviceType}:${deviceId} (${host}): ${err.message}`);
  }
};

const evaluateAlerts = async (deviceId: string, deviceType: MonitoredDeviceType, metrics: DeviceMetricData[]) => {
  const config = await db.monitoringConfig.findUnique({
    where: { deviceId_deviceType: { deviceId, deviceType } },
  });
  const cpuThreshold = config?.cpuThreshold || 80;
  const memThreshold = config?.memoryThreshold || 90;

  const cpu = metrics.find(m => m.metricType === 'CPU_USAGE');
  const mem = metrics.find(m => m.metricType === 'MEMORY_USAGE');

  if (cpu && cpu.value > cpuThreshold) {
    await createAlertIfNew(deviceId, deviceType, 'CPU_HIGH', 'HIGH', `High CPU Usage: ${cpu.value}%`, `CPU usage is ${cpu.value}%, threshold is ${cpuThreshold}%`, cpu.value, cpuThreshold);
  } else if (cpu && cpu.value <= cpuThreshold) {
    await autoResolveAlert(deviceId, deviceType, 'CPU_HIGH');
  }

  if (mem && mem.value > memThreshold) {
    await createAlertIfNew(deviceId, deviceType, 'MEMORY_HIGH', 'HIGH', `High Memory Usage: ${mem.value}%`, `Memory usage is ${mem.value}%, threshold is ${memThreshold}%`, mem.value, memThreshold);
  } else if (mem && mem.value <= memThreshold) {
    await autoResolveAlert(deviceId, deviceType, 'MEMORY_HIGH');
  }

  // Check for interface down
  const ifStatusMetrics = metrics.filter(m => m.metricType === 'INTERFACE_STATUS' && m.value === 0);
  for (const ifDown of ifStatusMetrics) {
    await createAlertIfNew(deviceId, deviceType, 'LINK_DOWN', 'CRITICAL', `Interface Down: ${ifDown.interfaceName}`, `Interface ${ifDown.interfaceName} is down`, 0, 1);
  }
};

const createAlertIfNew = async (
  deviceId: string, deviceType: MonitoredDeviceType,
  alertType: string, severity: string, title: string, description: string,
  value: number, threshold: number
) => {
  const existing = await db.deviceAlert.findFirst({
    where: { deviceId, deviceType, alertType: alertType as any, status: 'ACTIVE' },
  });
  if (existing) return; // Already active

  await db.deviceAlert.create({
    data: {
      deviceId, deviceType,
      alertType: alertType as any,
      severity: severity as any,
      title, description,
      value, threshold,
    },
  });
  logger.warn(`Monitoring Alert: ${title} on ${deviceType}:${deviceId}`);
};

const autoResolveAlert = async (deviceId: string, deviceType: MonitoredDeviceType, alertType: string) => {
  await db.deviceAlert.updateMany({
    where: { deviceId, deviceType, alertType: alertType as any, status: 'ACTIVE' },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
};

// ── Helpers ──

// Check if monitoring tables exist in the Prisma client (schema migrated)
const hasMonitoringTables = () => !!db.deviceAlert && !!db.deviceMetric && !!db.monitoringConfig;

// ── Query Methods ──

const getMonitoringOverview = async () => {
  const migrated = hasMonitoringTables();

  const [routers, olts, activeAlerts, criticalAlerts] = await Promise.all([
    prisma.router.findMany({
      where: { isActive: true },
      select: { id: true, name: true, host: true, status: true, lastConnectedAt: true },
    }),
    prisma.oLT.findMany({
      where: { status: { in: ['ACTIVE', 'APPROVED', 'MAINTENANCE'] as any[] } },
      select: { id: true, name: true, ipAddress: true, status: true, cpuUsage: true, ramUsage: true, uptime: true, snmpCommunity: true },
    }),
    migrated ? db.deviceAlert.count({ where: { status: 'ACTIVE' } }) : 0,
    migrated ? db.deviceAlert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' } }) : 0,
  ]);

  const routerDevices = await Promise.all(routers.map(async (r: any) => {
    let cpuVal = 0, memVal = 0, upVal = 0;
    if (migrated) {
      try {
        const latestMetrics = await db.deviceMetric.findMany({
          where: { deviceId: r.id, deviceType: 'ROUTER', metricType: { in: ['CPU_USAGE', 'MEMORY_USAGE', 'UPTIME'] } },
          orderBy: { collectedAt: 'desc' },
          take: 3,
          distinct: ['metricType'],
        });
        cpuVal = latestMetrics.find((m: any) => m.metricType === 'CPU_USAGE')?.value || 0;
        memVal = latestMetrics.find((m: any) => m.metricType === 'MEMORY_USAGE')?.value || 0;
        upVal = latestMetrics.find((m: any) => m.metricType === 'UPTIME')?.value || 0;
      } catch { /* tables may not exist yet */ }
    }
    return {
      id: r.id, name: r.name, host: r.host, status: r.status, deviceType: 'ROUTER' as const,
      cpuUsage: cpuVal, memoryUsage: memVal, uptime: upVal,
      snmpEnabled: false,
    };
  }));

  return {
    routers: routerDevices,
    olts: olts.map((o: any) => ({
      id: o.id, name: o.name, host: o.ipAddress, status: o.status, deviceType: 'OLT' as const,
      cpuUsage: o.cpuUsage || 0, memoryUsage: o.ramUsage || 0, uptime: Number(o.uptime || 0),
      snmpEnabled: !!o.snmpCommunity,
    })),
    activeAlerts,
    criticalAlerts,
  };
};

const getDeviceMetrics = async (deviceId: string, options: {
  metricType?: string; from?: string; to?: string; interfaceName?: string; limit?: number;
}) => {
  if (!hasMonitoringTables()) return [];
  const where: any = { deviceId };
  if (options.metricType) where.metricType = options.metricType;
  if (options.interfaceName) where.interfaceName = options.interfaceName;
  if (options.from || options.to) {
    where.collectedAt = {};
    if (options.from) where.collectedAt.gte = new Date(options.from);
    if (options.to) where.collectedAt.lte = new Date(options.to);
  }

  return db.deviceMetric.findMany({
    where,
    orderBy: { collectedAt: 'desc' },
    take: Number(options.limit) || 100,
  });
};

const getAlerts = async (options: {
  deviceType?: string; severity?: string; status?: string; page?: number; limit?: number;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  if (!hasMonitoringTables()) return { data: [], meta: { page, limit, totalPages: 0, total: 0 } };

  const where: any = {};
  if (options.deviceType) where.deviceType = options.deviceType;
  if (options.severity) where.severity = options.severity;
  if (options.status) where.status = options.status;

  const [alerts, total] = await Promise.all([
    db.deviceAlert.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.deviceAlert.count({ where }),
  ]);

  return { data: alerts, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const acknowledgeAlert = async (alertId: string, userId: string) => {
  if (!hasMonitoringTables()) return null;
  return db.deviceAlert.update({
    where: { id: alertId },
    data: { status: 'ACKNOWLEDGED', acknowledgedBy: userId, acknowledgedAt: new Date() },
  });
};

const resolveAlert = async (alertId: string) => {
  if (!hasMonitoringTables()) return null;
  return db.deviceAlert.update({
    where: { id: alertId },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
};

const getConfig = async (deviceId: string, deviceType: MonitoredDeviceType) => {
  const defaults = { deviceId, deviceType, pollingInterval: 300, cpuThreshold: 80, memoryThreshold: 90, tempThreshold: 75, retentionDays: 30, isEnabled: true };
  if (!hasMonitoringTables()) return defaults;
  const config = await db.monitoringConfig.findUnique({
    where: { deviceId_deviceType: { deviceId, deviceType } },
  });
  return config || defaults;
};

const updateConfig = async (deviceId: string, deviceType: MonitoredDeviceType, data: any) => {
  if (!hasMonitoringTables()) return null;
  return db.monitoringConfig.upsert({
    where: { deviceId_deviceType: { deviceId, deviceType } },
    create: { deviceId, deviceType, ...data },
    update: data,
  });
};

const cleanupOldMetrics = async () => {
  if (!hasMonitoringTables()) return 0;
  const configs = await db.monitoringConfig.findMany({ select: { retentionDays: true } });
  const minRetention = Math.min(...configs.map((c: any) => c.retentionDays), 30);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minRetention);

  const result = await db.deviceMetric.deleteMany({ where: { collectedAt: { lt: cutoff } } });
  return result.count;
};

const triggerPoll = async (deviceId: string, deviceType: MonitoredDeviceType) => {
  await pollAndStore(deviceId, deviceType);
};

export default {
  startAllPolling, startDevicePolling, stopDevicePolling,
  pollAndStore, getMonitoringOverview, getDeviceMetrics,
  getAlerts, acknowledgeAlert, resolveAlert,
  getConfig, updateConfig, cleanupOldMetrics, triggerPoll,
};
