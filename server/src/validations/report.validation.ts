import { z } from 'zod';

const revenueReport = {
  query: z.object({
    startDate: z.string(),
    endDate: z.string(),
    granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
  }),
};

const collectionReport = {
  query: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
};

const customerRevenueReport = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['totalPaid', 'invoiceCount', 'outstanding', 'fullName']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};

const exportReport = {
  params: z.object({
    type: z.enum(['revenue', 'collection', 'aging', 'customer-revenue']),
    format: z.enum(['pdf', 'csv']),
  }),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
  }),
};

export default { revenueReport, collectionReport, customerRevenueReport, exportReport };
