import { z } from 'zod';

const createCustomer = {
  body: z.object({
    username: z.string().min(1, 'Username is required').max(100),
    password: z.string().min(6).optional(),
    fullName: z.string().min(1, 'Full name is required').max(200),
    routerId: z.string().min(1, 'Router is required'),
    packageId: z.string().min(1, 'Package is required'),
    resellerId: z.string().optional(),
    connectionType: z.enum(['PPPOE', 'STATIC_IP', 'DHCP', 'HOTSPOT']).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    ipAddress: z.string().optional(),
    macAddress: z.string().optional(),
    billingCycle: z.coerce.number().int().positive().optional(),
    gracePeriod: z.coerce.number().int().min(0).optional(),
    autoSuspend: z.boolean().optional(),
    autoSuspendDays: z.coerce.number().int().min(0).optional(),
    customPrice: z.coerce.number().positive().optional(),
    installationDate: z.string().optional(),
    notes: z.string().optional(),
  }),
};

const updateCustomer = {
  params: z.object({ customerId: z.string().min(1) }),
  body: z.object({
    username: z.string().min(1).max(100).optional(),
    fullName: z.string().min(1).max(200).optional(),
    routerId: z.string().optional(),
    packageId: z.string().optional(),
    resellerId: z.string().nullable().optional(),
    connectionType: z.enum(['PPPOE', 'STATIC_IP', 'DHCP', 'HOTSPOT']).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    ipAddress: z.string().optional(),
    macAddress: z.string().optional(),
    billingCycle: z.coerce.number().int().positive().optional(),
    gracePeriod: z.coerce.number().int().min(0).optional(),
    autoSuspend: z.boolean().optional(),
    autoSuspendDays: z.coerce.number().int().min(0).optional(),
    customPrice: z.coerce.number().positive().nullable().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING_ACTIVATION']).optional(),
    notes: z.string().optional(),
  }),
};

const getCustomers = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING_ACTIVATION']).optional(),
    routerId: z.string().optional(),
    packageId: z.string().optional(),
    resellerId: z.string().optional(),
    sortBy: z.enum(['fullName', 'username', 'createdAt', 'nextBillingDate', 'status']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

const customerId = {
  params: z.object({ customerId: z.string().min(1) }),
};

const suspendCustomer = {
  params: z.object({ customerId: z.string().min(1) }),
  body: z.object({ reason: z.string().optional() }),
};

const trafficStats = {
  params: z.object({ customerId: z.string().min(1) }),
  query: z.object({
    periodType: z.enum(['HOURLY', 'DAILY', 'MONTHLY']).optional(),
    days: z.coerce.number().int().positive().max(365).optional(),
    limit: z.coerce.number().int().positive().max(365).optional(),
  }).default({}),
};

export default { createCustomer, updateCustomer, getCustomers, customerId, suspendCustomer, trafficStats };
