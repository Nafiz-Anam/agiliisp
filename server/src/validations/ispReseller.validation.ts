import { z } from 'zod';

const createReseller = {
  body: z.object({
    user: z.object({
      email: z.string().email('Valid email is required'),
      name: z.string().min(1, 'Name is required'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      phone: z.string().optional(),
    }),
    businessName: z.string().min(1, 'Business name is required').max(200),
    businessRegistration: z.string().optional(),
    taxId: z.string().optional(),
    commissionRate: z.coerce.number().min(0).max(100).optional(),
    creditLimit: z.coerce.number().positive().optional(),
    markupPercentage: z.coerce.number().min(0).max(100).optional(),
    canCreatePackages: z.boolean().optional(),
    canCreateCustomers: z.boolean().optional(),
    supportPhone: z.string().optional(),
    supportEmail: z.string().email().optional().or(z.literal('')),
    notes: z.string().optional(),
  }),
};

const updateReseller = {
  params: z.object({ resellerId: z.string().min(1) }),
  body: z.object({
    businessName: z.string().min(1).max(200).optional(),
    businessRegistration: z.string().optional(),
    taxId: z.string().optional(),
    commissionRate: z.coerce.number().min(0).max(100).optional(),
    creditLimit: z.coerce.number().positive().optional(),
    markupPercentage: z.coerce.number().min(0).max(100).optional(),
    canCreatePackages: z.boolean().optional(),
    canCreateCustomers: z.boolean().optional(),
    supportPhone: z.string().optional(),
    supportEmail: z.string().email().optional().or(z.literal('')),
    isActive: z.boolean().optional(),
    notes: z.string().optional(),
  }),
};

const getResellers = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    search: z.string().optional(),
    isActive: z.string().optional(),
    sortBy: z.enum(['businessName', 'createdAt', 'currentBalance']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

const resellerId = {
  params: z.object({ resellerId: z.string().min(1) }),
};

export default { createReseller, updateReseller, getResellers, resellerId };
