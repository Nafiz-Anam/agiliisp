import { z } from 'zod';

const createTicket = {
  body: z.object({
    customerId: z.string().min(1, 'Customer is required'),
    subject: z.string().min(1, 'Subject is required').max(500),
    description: z.string().min(1, 'Description is required'),
    category: z.string().min(1, 'Category is required'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    assignedTo: z.string().optional(),
  }),
};

const updateTicket = {
  params: z.object({ ticketId: z.string().min(1) }),
  body: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    assignedTo: z.string().nullable().optional(),
  }),
};

const addReply = {
  params: z.object({ ticketId: z.string().min(1) }),
  body: z.object({
    message: z.string().min(1, 'Message is required'),
    isInternal: z.boolean().optional(),
  }),
};

const getTickets = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    customerId: z.string().optional(),
    resellerId: z.string().optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    assignedTo: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['openedAt', 'priority', 'status', 'resolvedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }).default({}),
};

const ticketId = {
  params: z.object({ ticketId: z.string().min(1) }),
};

export default { createTicket, updateTicket, addReply, getTickets, ticketId };
