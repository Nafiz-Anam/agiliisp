import { z } from 'zod';
import {
  OLTStatus,
  PonTechnology,
  AlertSeverity,
  MaintenanceType,
  MaintenanceStatus,
} from '@prisma/client';

// Common pagination schema
const paginationSchema = z.object({
  page: z.string().optional().transform(Number),
  limit: z.string().optional().transform(Number),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// OLT validation schemas
const createOltSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  location: z.string().optional(),
  ipAddress: z.string().refine(val => /^(\d{1,3}\.){3}\d{1,3}$/.test(val), 'Invalid IP address'),
  serialNumber: z.string().optional(),
  oltBrandId: z.string().min(1, 'OLT brand is required'),
  oltVersionId: z.string().min(1, 'OLT version is required'),
  ponTechnology: z.nativeEnum(PonTechnology),
  maxCapacity: z
    .string()
    .optional()
    .transform(Number)
    .refine(val => !val || (val >= 1 && val <= 1024), 'Capacity must be between 1 and 1024'),
  latitude: z
    .string()
    .optional()
    .transform(Number)
    .refine(val => !val || (val >= -90 && val <= 90), 'Latitude must be between -90 and 90'),
  longitude: z
    .string()
    .optional()
    .transform(Number)
    .refine(val => !val || (val >= -180 && val <= 180), 'Longitude must be between -180 and 180'),
  address: z.string().optional(),
  managementInterface: z.string().optional(),
  snmpCommunity: z.string().optional(),
  sshPort: z
    .string()
    .optional()
    .transform(Number)
    .refine(val => !val || (val >= 1 && val <= 65535), 'Port must be between 1 and 65535'),
});

const updateOltSchema = createOltSchema.partial();

const getOltsSchema = paginationSchema.extend({
  status: z.nativeEnum(OLTStatus).optional(),
  brand: z.string().optional(),
  technology: z.nativeEnum(PonTechnology).optional(),
});

const oltIdSchema = z.object({
  oltId: z.string().min(1, 'OLT ID is required'),
});

// ONU validation schemas
const provisionOnuSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required'),
  macAddress: z
    .string()
    .regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Invalid MAC address')
    .optional(),
  portId: z.string().min(1, 'Port ID is required'),
  customerId: z.string().optional(),
  vlanId: z.number().int().min(1).max(4094).optional(),
  speedProfile: z.string().optional(),
  qosProfile: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().optional(),
});

const getOnusSchema = paginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'FAULT', 'BLOCKED', 'PROVISIONING', 'UNKNOWN']).optional(),
});

// Port validation schemas
const portIdSchema = z.object({
  portId: z.string().min(1, 'Port ID is required'),
});

const getPortsSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'FAULT', 'DISABLED', 'TESTING']).optional(),
  portType: z.enum(['PON', 'Ethernet', 'Management', 'Uplink']).optional(),
});

// Alert validation schemas
const getAlertsSchema = paginationSchema.extend({
  severity: z.nativeEnum(AlertSeverity).optional(),
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED']).optional(),
});

// Maintenance validation schemas
const createMaintenanceScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  scheduledFor: z.string().datetime('Invalid date format'),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  type: z.nativeEnum(MaintenanceType),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
});

const getMaintenanceSchedulesSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus).optional(),
});

// Query parameter schemas
const signalHistorySchema = z.object({
  hours: z
    .string()
    .optional()
    .transform(Number)
    .refine(val => !val || (val >= 1 && val <= 168), 'Hours must be between 1 and 168'),
});

const trafficStatsSchema = z.object({
  hours: z
    .string()
    .optional()
    .transform(Number)
    .refine(val => !val || (val >= 1 && val <= 168), 'Hours must be between 1 and 168'),
});

export default {
  // OLT validations
  createOlt: createOltSchema,
  updateOlt: updateOltSchema,
  getOlts: getOltsSchema,
  oltId: oltIdSchema,

  // ONU validations
  provisionOnu: provisionOnuSchema,
  getOnus: getOnusSchema,

  // Port validations
  portId: portIdSchema,
  getPorts: getPortsSchema,

  // Alert validations
  getAlerts: getAlertsSchema,

  // Maintenance validations
  createMaintenanceSchedule: createMaintenanceScheduleSchema,
  getMaintenanceSchedules: getMaintenanceSchedulesSchema,

  // Query validations
  signalHistory: signalHistorySchema,
  trafficStats: trafficStatsSchema,
};
