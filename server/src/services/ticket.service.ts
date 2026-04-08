import httpStatus from 'http-status';
import { TicketPriority, TicketStatus, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';

const generateTicketNumber = async (): Promise<string> => {
  const count = await prisma.supportTicket.count();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `TKT-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

const createTicket = async (
  body: {
    customerId: string;
    subject: string;
    description: string;
    category: string;
    priority?: TicketPriority;
    assignedTo?: string;
  },
  createdByUserId?: string
) => {
  const customer = await prisma.ispCustomer.findUnique({ where: { id: body.customerId } });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');

  const ticketNumber = await generateTicketNumber();

  return prisma.supportTicket.create({
    data: {
      ticketNumber,
      customerId: body.customerId,
      resellerId: customer.resellerId ?? undefined,
      subject: body.subject,
      description: body.description,
      category: body.category,
      priority: body.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      assignedTo: body.assignedTo,
    },
    include: {
      customer: { select: { id: true, fullName: true, username: true, email: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      _count: { select: { replies: true } },
    },
  });
};

const getTickets = async (options: {
  page?: number;
  limit?: number;
  customerId?: string;
  resellerId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const {
    customerId,
    resellerId,
    status,
    priority,
    assignedTo,
    search,
    sortBy = 'openedAt',
    sortOrder = 'desc',
  } = options;
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;

  const where: Prisma.SupportTicketWhereInput = {};

  if (customerId) where.customerId = customerId;
  if (resellerId) where.resellerId = resellerId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedTo) where.assignedTo = assignedTo;
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const skip = (page - 1) * limit;
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, fullName: true, username: true, email: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        _count: { select: { replies: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    data: tickets,
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

const getTicketById = async (id: string) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, fullName: true, username: true, email: true, phone: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });
  if (!ticket) throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  return ticket;
};

const updateTicketById = async (
  id: string,
  body: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string }
) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');

  const updateData: Prisma.SupportTicketUpdateInput = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === TicketStatus.RESOLVED) updateData.resolvedAt = new Date();
    if (body.status === TicketStatus.CLOSED) updateData.closedAt = new Date();
  }
  if (body.priority) updateData.priority = body.priority;
  if (body.assignedTo !== undefined) {
    updateData.assignedUser = body.assignedTo
      ? { connect: { id: body.assignedTo } }
      : { disconnect: true };
  }

  return prisma.supportTicket.update({
    where: { id },
    data: updateData,
    include: {
      customer: { select: { id: true, fullName: true, username: true } },
      assignedUser: { select: { id: true, name: true, email: true } },
    },
  });
};

const addReply = async (
  ticketId: string,
  userId: string,
  message: string,
  isInternal = false
) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId,
      userId,
      message,
      isInternal,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  // Auto-update ticket status when staff replies
  if (!isInternal && ticket.status === TicketStatus.PENDING_CUSTOMER) {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.IN_PROGRESS },
    });
  }

  return reply;
};

export default {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketById,
  addReply,
};
