import { z } from 'zod';

const getDeviceMetrics = {
  params: z.object({ deviceId: z.string() }),
  query: z.object({
    metricType: z.enum(['CPU_USAGE', 'MEMORY_USAGE', 'UPTIME', 'INTERFACE_IN_BYTES', 'INTERFACE_OUT_BYTES', 'INTERFACE_STATUS', 'TEMPERATURE', 'DISK_USAGE']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    interfaceName: z.string().optional(),
    limit: z.string().optional(),
  }),
};

const getAlerts = {
  query: z.object({
    deviceType: z.enum(['ROUTER', 'OLT']).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};

const alertId = {
  params: z.object({ alertId: z.string() }),
};

const deviceId = {
  params: z.object({ deviceId: z.string() }),
};

const updateConfig = {
  params: z.object({ deviceId: z.string() }),
  body: z.object({
    deviceType: z.enum(['ROUTER', 'OLT']),
    pollingInterval: z.number().min(60).max(3600).optional(),
    cpuThreshold: z.number().min(1).max(100).optional(),
    memoryThreshold: z.number().min(1).max(100).optional(),
    tempThreshold: z.number().min(1).max(150).optional(),
    retentionDays: z.number().min(1).max(365).optional(),
    isEnabled: z.boolean().optional(),
  }),
};

const triggerPoll = {
  params: z.object({ deviceId: z.string() }),
  body: z.object({
    deviceType: z.enum(['ROUTER', 'OLT']),
  }),
};

export default { getDeviceMetrics, getAlerts, alertId, deviceId, updateConfig, triggerPoll };
