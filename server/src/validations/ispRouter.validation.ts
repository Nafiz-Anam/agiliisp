import { z } from 'zod';

const createRouter = {
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    host: z.string().min(1, 'Host is required'),
    port: z.coerce.number().int().positive().optional(),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    useSSL: z.boolean().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    syncEnabled: z.boolean().optional(),
  }),
};

const updateRouter = {
  params: z.object({ routerId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    host: z.string().optional(),
    port: z.coerce.number().int().positive().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    useSSL: z.boolean().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    syncEnabled: z.boolean().optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE']).optional(),
  }),
};

const getRouters = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    search: z.string().optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'WARNING', 'MAINTENANCE']).optional(),
    sortBy: z.enum(['name', 'status', 'createdAt', 'lastSyncAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

const routerId = {
  params: z.object({ routerId: z.string().min(1) }),
};

const syncLogs = {
  params: z.object({ routerId: z.string().min(1) }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
  }).default({}),
};

const disconnectUser = {
  params: z.object({ routerId: z.string().min(1) }),
  body: z.object({ connectionId: z.string().min(1) }),
};

export default { createRouter, updateRouter, getRouters, routerId, syncLogs, disconnectUser };
