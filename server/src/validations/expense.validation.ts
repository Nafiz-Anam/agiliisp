import { z } from 'zod';

const categories = ['SALARY', 'RENT', 'UTILITIES', 'BANDWIDTH', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'TRANSPORT', 'TAXES', 'LICENSES', 'INSURANCE', 'OTHER'] as const;

const createExpense = {
  body: z.object({
    category: z.enum(categories),
    amount: z.number().positive(),
    description: z.string().min(1).max(500),
    vendor: z.string().max(200).optional(),
    referenceNo: z.string().max(100).optional(),
    expenseDate: z.string(),
    paymentMethod: z.string().optional(),
    isRecurring: z.boolean().optional(),
    recurringDay: z.number().min(1).max(31).optional(),
    notes: z.string().max(2000).optional(),
  }),
};

const updateExpense = {
  params: z.object({ expenseId: z.string() }),
  body: z.object({
    category: z.enum(categories).optional(),
    amount: z.number().positive().optional(),
    description: z.string().min(1).max(500).optional(),
    vendor: z.string().max(200).nullable().optional(),
    referenceNo: z.string().max(100).nullable().optional(),
    expenseDate: z.string().optional(),
    paymentMethod: z.string().nullable().optional(),
    isRecurring: z.boolean().optional(),
    recurringDay: z.number().min(1).max(31).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }),
};

const getExpenses = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    category: z.enum(categories).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['expenseDate', 'amount', 'category', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

const expenseId = {
  params: z.object({ expenseId: z.string() }),
};

const profitLoss = {
  query: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
};

const summary = {
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};

export default { createExpense, updateExpense, getExpenses, expenseId, profitLoss, summary };
