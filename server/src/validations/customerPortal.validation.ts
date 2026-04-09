import { z } from 'zod';

const getInvoices = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED']).optional(),
  }),
};

const invoiceId = {
  params: z.object({
    invoiceId: z.string(),
  }),
};

const getPayments = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
};

const getTickets = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  }),
};

const ticketId = {
  params: z.object({
    ticketId: z.string(),
  }),
};

const createTicket = {
  body: z.object({
    subject: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    category: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  }),
};

const addReply = {
  params: z.object({
    ticketId: z.string(),
  }),
  body: z.object({
    message: z.string().min(1).max(5000),
  }),
};

const updateProfile = {
  body: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }),
};

const changePassword = {
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
};

const trafficStats = {
  query: z.object({
    period: z.enum(['HOURLY', 'DAILY', 'MONTHLY']).optional(),
  }),
};

export default {
  getInvoices,
  invoiceId,
  getPayments,
  getTickets,
  ticketId,
  createTicket,
  addReply,
  updateProfile,
  changePassword,
  trafficStats,
};
