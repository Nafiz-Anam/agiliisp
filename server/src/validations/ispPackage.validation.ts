import { z } from 'zod';

const createPackage = {
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    routerId: z.string().min(1, 'Router is required'),
    downloadSpeed: z.coerce.number().int().positive('Download speed must be positive'),
    uploadSpeed: z.coerce.number().int().positive('Upload speed must be positive'),
    price: z.coerce.number().positive('Price must be positive'),
    costPrice: z.coerce.number().positive().optional(),
    dataLimit: z.coerce.number().int().positive().optional(),
    burstDownload: z.coerce.number().int().positive().optional(),
    burstUpload: z.coerce.number().int().positive().optional(),
    threshold: z.coerce.number().int().positive().optional(),
    burstTime: z.coerce.number().int().positive().optional(),
    priority: z.coerce.number().int().min(0).max(8).optional(),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
    syncEnabled: z.boolean().optional(),
  }),
};

const updatePackage = {
  params: z.object({ packageId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    downloadSpeed: z.coerce.number().int().positive().optional(),
    uploadSpeed: z.coerce.number().int().positive().optional(),
    price: z.coerce.number().positive().optional(),
    costPrice: z.coerce.number().positive().optional(),
    dataLimit: z.coerce.number().int().positive().nullable().optional(),
    burstDownload: z.coerce.number().int().positive().nullable().optional(),
    burstUpload: z.coerce.number().int().positive().nullable().optional(),
    threshold: z.coerce.number().int().positive().nullable().optional(),
    burstTime: z.coerce.number().int().positive().nullable().optional(),
    priority: z.coerce.number().int().min(0).max(8).optional(),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
    isActive: z.boolean().optional(),
    syncEnabled: z.boolean().optional(),
  }),
};

const getPackages = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    search: z.string().optional(),
    routerId: z.string().optional(),
    isActive: z.string().optional(),
    sortBy: z.enum(['name', 'price', 'downloadSpeed', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

const packageId = {
  params: z.object({ packageId: z.string().min(1) }),
};

export default { createPackage, updatePackage, getPackages, packageId };
