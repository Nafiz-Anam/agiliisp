import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import bcrypt from 'bcryptjs';

const getCustomerByUserId = async (userId: string) => {
  const customer = await prisma.ispCustomer.findFirst({
    where: { userId },
    include: {
      package: { select: { id: true, name: true, downloadSpeed: true, uploadSpeed: true, dataLimit: true, price: true } },
    },
  });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer profile not found');
  return customer;
};

const getDashboard = async (userId: string) => {
  const customer = await getCustomerByUserId(userId);

  const [recentInvoices, openTickets, trafficStats] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: customer.id },
      orderBy: { invoiceDate: 'desc' },
      take: 3,
      select: { id: true, invoiceNumber: true, totalAmount: true, balanceDue: true, status: true, dueDate: true },
    }),
    prisma.supportTicket.count({ where: { customerId: customer.id, status: { in: ['OPEN', 'IN_PROGRESS'] as any[] } } }),
    prisma.trafficStat.findMany({
      where: { customerId: customer.id, periodType: 'DAILY' },
      orderBy: { periodStart: 'desc' },
      take: 30,
      select: { periodStart: true, totalBytesIn: true, totalBytesOut: true },
    }),
  ]);

  return {
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      username: customer.username,
      status: customer.status,
      isOnline: customer.isOnline,
      lastOnlineAt: customer.lastOnlineAt,
      dataUsed: customer.dataUsed ? Number(customer.dataUsed) : 0,
      dataLimit: customer.dataLimit ? Number(customer.dataLimit) : null,
      nextBillingDate: customer.nextBillingDate,
    },
    package: customer.package ? {
      name: customer.package.name,
      downloadSpeed: Number(customer.package.downloadSpeed),
      uploadSpeed: Number(customer.package.uploadSpeed),
      dataLimit: customer.package.dataLimit ? Number(customer.package.dataLimit) : null,
      price: Number(customer.package.price),
    } : null,
    recentInvoices: recentInvoices.map(inv => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      balanceDue: Number(inv.balanceDue),
    })),
    openTickets,
    trafficStats: trafficStats.map(s => ({
      date: s.periodStart,
      bytesIn: Number(s.totalBytesIn),
      bytesOut: Number(s.totalBytesOut),
    })).reverse(),
  };
};

const getMyInvoices = async (userId: string, options: { page?: number; limit?: number; status?: string }) => {
  const customer = await getCustomerByUserId(userId);
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const where: any = { customerId: customer.id };
  if (options.status) where.status = options.status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: { items: true },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: invoices,
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

const getMyInvoiceById = async (userId: string, invoiceId: string) => {
  const customer = await getCustomerByUserId(userId);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true, payments: true },
  });
  if (!invoice || invoice.customerId !== customer.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invoice not found');
  }
  return invoice;
};

const getMyPayments = async (userId: string, options: { page?: number; limit?: number }) => {
  const customer = await getCustomerByUserId(userId);
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const where = { customerId: customer.id, status: 'COMPLETED' as const };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      include: { invoice: { select: { invoiceNumber: true } } },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: payments,
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

const getMyTickets = async (userId: string, options: { page?: number; limit?: number; status?: string }) => {
  const customer = await getCustomerByUserId(userId);
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;
  const where: any = { customerId: customer.id };
  if (options.status) where.status = options.status;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { openedAt: 'desc' },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return {
    data: tickets,
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

const getMyTicketById = async (userId: string, ticketId: string) => {
  const customer = await getCustomerByUserId(userId);
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      replies: {
        where: { isInternal: false },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
  });
  if (!ticket || ticket.customerId !== customer.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }
  return ticket;
};

const createMyTicket = async (userId: string, body: { subject: string; description: string; category?: string; priority?: string }) => {
  const customer = await getCustomerByUserId(userId);

  // Generate ticket number
  const count = await prisma.supportTicket.count();
  const now = new Date();
  const ticketNumber = `TKT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

  return prisma.supportTicket.create({
    data: {
      ticketNumber,
      subject: body.subject,
      description: body.description,
      category: body.category || 'GENERAL',
      priority: (body.priority as any) || 'MEDIUM',
      status: 'OPEN' as any,
      customerId: customer.id,
      resellerId: customer.resellerId ?? undefined,
    },
  });
};

const addMyTicketReply = async (userId: string, ticketId: string, message: string) => {
  const customer = await getCustomerByUserId(userId);
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.customerId !== customer.id) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  return prisma.ticketReply.create({
    data: {
      ticketId,
      userId,
      message,
      isInternal: false,
    },
  });
};

const getMyProfile = async (userId: string) => {
  const customer = await getCustomerByUserId(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  return {
    id: customer.id,
    fullName: customer.fullName,
    username: customer.username,
    email: customer.email,
    phone: customer.phone,
    phoneSecondary: customer.phoneSecondary,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zipCode: customer.zipCode,
    country: customer.country,
    status: customer.status,
    package: customer.package,
    billingCycle: customer.billingCycle,
    nextBillingDate: customer.nextBillingDate,
    installationDate: customer.installationDate,
    userEmail: user?.email,
  };
};

const updateMyProfile = async (userId: string, data: { phone?: string; email?: string; address?: string; city?: string; state?: string; zipCode?: string }) => {
  const customer = await getCustomerByUserId(userId);
  return prisma.ispCustomer.update({
    where: { id: customer.id },
    data: {
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.zipCode !== undefined && { zipCode: data.zipCode }),
    },
  });
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(httpStatus.BAD_REQUEST, 'Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
};

const getMyTrafficStats = async (userId: string, period: string = 'DAILY') => {
  const customer = await getCustomerByUserId(userId);
  const stats = await prisma.trafficStat.findMany({
    where: { customerId: customer.id, periodType: period as any },
    orderBy: { periodStart: 'desc' },
    take: period === 'HOURLY' ? 48 : period === 'DAILY' ? 30 : 12,
  });

  return stats.map(s => ({
    periodStart: s.periodStart,
    bytesIn: Number(s.totalBytesIn),
    bytesOut: Number(s.totalBytesOut),
    peakDownload: s.peakDownloadSpeed ? Number(s.peakDownloadSpeed) : 0,
    peakUpload: s.peakUploadSpeed ? Number(s.peakUploadSpeed) : 0,
  })).reverse();
};

export default {
  getCustomerByUserId,
  getDashboard,
  getMyInvoices,
  getMyInvoiceById,
  getMyPayments,
  getMyTickets,
  getMyTicketById,
  createMyTicket,
  addMyTicketReply,
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyTrafficStats,
};
