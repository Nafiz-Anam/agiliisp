import { z } from 'zod';

const createInvoice = {
  body: z.object({
    customerId: z.string().min(1, 'Customer is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    items: z.array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        packageId: z.string().optional(),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().positive(),
      })
    ).min(1, 'At least one item is required'),
    notes: z.string().optional(),
    taxAmount: z.coerce.number().min(0).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
  }),
};

const updateInvoice = {
  params: z.object({ invoiceId: z.string().min(1) }),
  body: z.object({
    status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED']).optional(),
    notes: z.string().optional(),
    dueDate: z.string().optional(),
  }),
};

const addPayment = {
  params: z.object({ invoiceId: z.string().min(1) }),
  body: z.object({
    amount: z.coerce.number().positive('Amount must be positive'),
    paymentMethod: z.enum([
      'CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT_CARD',
      'DEBIT_CARD', 'CHECK', 'ONLINE_PAYMENT', 'AGENT_COLLECTED',
    ]),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
  }),
};

const autoGenerate = {
  body: z.object({
    dueDate: z.string().min(1, 'Due date is required'),
  }),
};

const getInvoices = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    customerId: z.string().optional(),
    resellerId: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['invoiceDate', 'dueDate', 'totalAmount', 'status', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

const invoiceId = {
  params: z.object({ invoiceId: z.string().min(1) }),
};

export default { createInvoice, updateInvoice, addPayment, autoGenerate, getInvoices, invoiceId };
