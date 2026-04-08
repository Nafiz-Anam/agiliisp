import prisma from '../client';
import { CustomerStatus, InvoiceStatus, RouterStatus, TicketStatus } from '@prisma/client';

/**
 * Get Admin Dashboard Statistics
 */
const getAdminDashboard = async () => {
  // Get customer statistics
  const customerStats = await prisma.ispCustomer.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const totalCustomers = customerStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const activeCustomers =
    customerStats.find((s) => s.status === CustomerStatus.ACTIVE)?._count.id || 0;
  const suspendedCustomers =
    customerStats.find((s) => s.status === CustomerStatus.SUSPENDED)?._count.id || 0;

  // Get online customers count
  const onlineCustomers = await prisma.ispCustomer.count({
    where: { isOnline: true },
  });

  // Get router statistics
  const routerStats = await prisma.router.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const totalRouters = routerStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const onlineRouters =
    routerStats.find((s) => s.status === RouterStatus.ONLINE)?._count.id || 0;
  const offlineRouters =
    routerStats.find((s) => s.status === RouterStatus.OFFLINE)?._count.id || 0;

  // Get invoice statistics
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      status: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);

  const invoiceCounts = await prisma.invoice.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const pendingInvoices =
    invoiceCounts.find((s) =>
      ([InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] as InvoiceStatus[]).includes(s.status)
    )?._count.id || 0;

  const overdueInvoices =
    invoiceCounts.find((s) => s.status === InvoiceStatus.OVERDUE)?._count.id || 0;

  // Get ticket statistics
  const openTickets = await prisma.supportTicket.count({
    where: {
      status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
    },
  });

  // Get recent activities
  const recentSyncs = await prisma.syncLog.findMany({
    take: 5,
    orderBy: { startedAt: 'desc' },
    include: {
      router: {
        select: { name: true },
      },
      user: {
        select: { name: true },
      },
    },
  });

  const recentCustomers = await prisma.ispCustomer.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      status: true,
      createdAt: true,
    },
  });

  // Get package count
  const totalPackages = await prisma.internetPackage.count({
    where: { isActive: true },
  });

  // Get reseller count
  const totalResellers = await prisma.reseller.count({
    where: { isActive: true },
  });

  return {
    stats: {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        suspended: suspendedCustomers,
        online: onlineCustomers,
        offline: totalCustomers - onlineCustomers,
      },
      routers: {
        total: totalRouters,
        online: onlineRouters,
        offline: offlineRouters,
      },
      finances: {
        totalRevenue30Days: totalRevenue,
        totalCollected30Days: totalCollected,
        outstandingAmount: totalRevenue - totalCollected,
        pendingInvoices,
        overdueInvoices,
      },
      tickets: {
        open: openTickets,
      },
      packages: {
        total: totalPackages,
      },
      resellers: {
        total: totalResellers,
      },
    },
    recentSyncs,
    recentCustomers,
  };
};

/**
 * Get Reseller Dashboard Statistics
 */
const getResellerDashboard = async (resellerId: string) => {
  // Verify reseller exists
  const reseller = await prisma.reseller.findUnique({
    where: { id: resellerId },
    select: {
      id: true,
      businessName: true,
      currentBalance: true,
      creditLimit: true,
      markupPercentage: true,
      commissionRate: true,
    },
  });

  if (!reseller) {
    throw new Error('Reseller not found');
  }

  // Get customer statistics
  const customerStats = await prisma.ispCustomer.groupBy({
    by: ['status'],
    where: { resellerId },
    _count: { id: true },
  });

  const totalCustomers = customerStats.reduce((sum, stat) => sum + stat._count.id, 0);
  const activeCustomers =
    customerStats.find((s) => s.status === CustomerStatus.ACTIVE)?._count.id || 0;
  const suspendedCustomers =
    customerStats.find((s) => s.status === CustomerStatus.SUSPENDED)?._count.id || 0;

  const onlineCustomers = await prisma.ispCustomer.count({
    where: { resellerId, isOnline: true },
  });

  // Get invoice statistics for last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const invoices = await prisma.invoice.findMany({
    where: {
      resellerId,
      invoiceDate: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      status: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
  const commission = totalCollected * reseller.commissionRate.toNumber() / 100;

  // Get pending invoices
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      resellerId,
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
    },
    take: 5,
    orderBy: { dueDate: 'asc' },
    select: {
      id: true,
      invoiceNumber: true,
      customer: {
        select: {
          fullName: true,
        },
      },
      totalAmount: true,
      balanceDue: true,
      dueDate: true,
    },
  });

  // Get recent customers
  const recentCustomers = await prisma.ispCustomer.findMany({
    where: { resellerId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      fullName: true,
      status: true,
      isOnline: true,
      package: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    reseller,
    stats: {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        suspended: suspendedCustomers,
        online: onlineCustomers,
        offline: totalCustomers - onlineCustomers,
      },
      finances: {
        totalRevenue30Days: totalRevenue,
        totalCollected30Days: totalCollected,
        commission,
        outstandingAmount: totalRevenue - totalCollected,
      },
    },
    pendingInvoices,
    recentCustomers,
  };
};

/**
 * Get Customer Dashboard Statistics
 */
const getCustomerDashboard = async (customerId: string) => {
  // Verify customer exists
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    include: {
      router: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      package: {
        select: {
          id: true,
          name: true,
          downloadSpeed: true,
          uploadSpeed: true,
          price: true,
        },
      },
      reseller: {
        select: {
          businessName: true,
          supportPhone: true,
          supportEmail: true,
        },
      },
    },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Get pending invoices
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      customerId,
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
    },
    orderBy: { dueDate: 'asc' },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      balanceDue: true,
      status: true,
      dueDate: true,
      invoiceDate: true,
    },
  });

  // Get recent invoices
  const recentInvoices = await prisma.invoice.findMany({
    where: { customerId },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      status: true,
      invoiceDate: true,
    },
  });

  // Get support tickets
  const tickets = await prisma.supportTicket.findMany({
    where: { customerId },
    take: 5,
    orderBy: { openedAt: 'desc' },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      openedAt: true,
    },
  });

  // Get payment history
  const payments = await prisma.payment.findMany({
    where: { customerId },
    take: 5,
    orderBy: { paymentDate: 'desc' },
    select: {
      id: true,
      amount: true,
      paymentMethod: true,
      paymentDate: true,
      status: true,
    },
  });

  return {
    customer: {
      id: customer.id,
      username: customer.username,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      isOnline: customer.isOnline,
      lastOnlineAt: customer.lastOnlineAt,
      installationDate: customer.installationDate,
      nextBillingDate: customer.nextBillingDate,
      dataUsed: customer.dataUsed.toString(),
      dataLimit: customer.dataLimit?.toString() || 'Unlimited',
      router: customer.router,
      package: customer.package,
      reseller: customer.reseller,
    },
    pendingInvoices,
    recentInvoices,
    tickets,
    payments,
  };
};

/**
 * Get system-wide statistics for admin
 */
const getSystemStats = async () => {
  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: { gte: sixMonthsAgo },
      status: InvoiceStatus.PAID,
    },
    select: {
      paidAmount: true,
      invoiceDate: true,
    },
  });

  const revenueByMonth: Record<string, number> = {};
  invoices.forEach((inv) => {
    const monthKey = inv.invoiceDate.toISOString().slice(0, 7); // YYYY-MM
    revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + inv.paidAmount.toNumber();
  });

  // Customer growth by month
  const customers = await prisma.ispCustomer.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      createdAt: true,
    },
  });

  const customersByMonth: Record<string, number> = {};
  customers.forEach((cust) => {
    const monthKey = cust.createdAt.toISOString().slice(0, 7);
    customersByMonth[monthKey] = (customersByMonth[monthKey] || 0) + 1;
  });

  // Package distribution
  const packageDistribution = await prisma.ispCustomer.groupBy({
    by: ['packageId'],
    _count: { id: true },
  });

  const packageDetails = await prisma.internetPackage.findMany({
    where: {
      id: { in: packageDistribution.map((p) => p.packageId) },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const packageStats = packageDistribution.map((dist) => ({
    package: packageDetails.find((p) => p.id === dist.packageId)?.name || 'Unknown',
    count: dist._count.id,
  }));

  return {
    revenueByMonth,
    customersByMonth,
    packageStats,
  };
};

export default {
  getAdminDashboard,
  getResellerDashboard,
  getCustomerDashboard,
  getSystemStats,
};
