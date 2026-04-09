import prisma from '../client';
import { Prisma } from '@prisma/client';

type Granularity = 'daily' | 'weekly' | 'monthly';

const getRevenueReport = async (startDate: string, endDate: string, granularity: Granularity = 'monthly') => {
  const truncUnit = granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : 'month';

  const data: any[] = await prisma.$queryRaw`
    SELECT
      date_trunc(${truncUnit}, p.payment_date) AS period,
      SUM(p.amount)::float AS "totalRevenue",
      COUNT(*)::int AS "paymentCount"
    FROM payments p
    WHERE p.status = 'COMPLETED'
      AND p.payment_date >= ${new Date(startDate)}::timestamp
      AND p.payment_date <= ${new Date(endDate)}::timestamp
    GROUP BY period
    ORDER BY period ASC
  `;

  return data.map(r => ({
    period: r.period,
    totalRevenue: Number(r.totalRevenue || 0),
    paymentCount: Number(r.paymentCount || 0),
  }));
};

const getCollectionReport = async (startDate: string, endDate: string) => {
  // Collection rate trend (monthly)
  const trend: any[] = await prisma.$queryRaw`
    SELECT
      date_trunc('month', i.invoice_date) AS period,
      SUM(i.total_amount)::float AS "totalInvoiced",
      SUM(i.paid_amount)::float AS "totalCollected"
    FROM invoices i
    WHERE i.status != 'CANCELLED'
      AND i.invoice_date >= ${new Date(startDate)}::timestamp
      AND i.invoice_date <= ${new Date(endDate)}::timestamp
    GROUP BY period
    ORDER BY period ASC
  `;

  const collectionTrend = trend.map(r => ({
    period: r.period,
    totalInvoiced: Number(r.totalInvoiced || 0),
    totalCollected: Number(r.totalCollected || 0),
    rate: Number(r.totalInvoiced) > 0 ? Math.round((Number(r.totalCollected) / Number(r.totalInvoiced)) * 100) : 0,
  }));

  // Payment method breakdown
  const methods: any[] = await prisma.$queryRaw`
    SELECT
      p.payment_method AS method,
      SUM(p.amount)::float AS total,
      COUNT(*)::int AS count
    FROM payments p
    WHERE p.status = 'COMPLETED'
      AND p.payment_date >= ${new Date(startDate)}::timestamp
      AND p.payment_date <= ${new Date(endDate)}::timestamp
    GROUP BY p.payment_method
    ORDER BY total DESC
  `;

  const methodBreakdown = methods.map(r => ({
    method: r.method,
    total: Number(r.total || 0),
    count: Number(r.count || 0),
  }));

  // Top 10 paying customers
  const topCustomers: any[] = await prisma.$queryRaw`
    SELECT
      c.id,
      c.full_name AS "fullName",
      c.username,
      SUM(p.amount)::float AS "totalPaid",
      COUNT(p.id)::int AS "paymentCount"
    FROM payments p
    JOIN invoices inv ON inv.id = p.invoice_id
    JOIN isp_customers c ON c.id = inv.customer_id
    WHERE p.status = 'COMPLETED'
      AND p.payment_date >= ${new Date(startDate)}::timestamp
      AND p.payment_date <= ${new Date(endDate)}::timestamp
    GROUP BY c.id, c.full_name, c.username
    ORDER BY "totalPaid" DESC
    LIMIT 10
  `;

  return {
    collectionTrend,
    methodBreakdown,
    topCustomers: topCustomers.map(r => ({
      ...r,
      totalPaid: Number(r.totalPaid || 0),
      paymentCount: Number(r.paymentCount || 0),
    })),
  };
};

const getAgingReport = async () => {
  const now = new Date();

  const buckets: any[] = await prisma.$queryRaw`
    SELECT
      CASE
        WHEN EXTRACT(DAY FROM ${now}::timestamp - i.due_date) BETWEEN 0 AND 30 THEN '0-30'
        WHEN EXTRACT(DAY FROM ${now}::timestamp - i.due_date) BETWEEN 31 AND 60 THEN '31-60'
        WHEN EXTRACT(DAY FROM ${now}::timestamp - i.due_date) BETWEEN 61 AND 90 THEN '61-90'
        ELSE '90+'
      END AS bucket,
      COUNT(*)::int AS count,
      SUM(i.balance_due)::float AS total
    FROM invoices i
    WHERE i.status IN ('SENT', 'PARTIALLY_PAID', 'OVERDUE')
      AND i.balance_due > 0
    GROUP BY bucket
    ORDER BY bucket
  `;

  // Detailed invoice list
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      balanceDue: { gt: 0 },
    },
    include: {
      customer: { select: { id: true, fullName: true, username: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 100,
  });

  const bucketMap: Record<string, { count: number; total: number }> = {
    '0-30': { count: 0, total: 0 },
    '31-60': { count: 0, total: 0 },
    '61-90': { count: 0, total: 0 },
    '90+': { count: 0, total: 0 },
  };
  buckets.forEach(b => {
    bucketMap[b.bucket] = { count: Number(b.count), total: Number(b.total || 0) };
  });

  return {
    buckets: bucketMap,
    totalOutstanding: Object.values(bucketMap).reduce((s, b) => s + b.total, 0),
    totalCount: Object.values(bucketMap).reduce((s, b) => s + b.count, 0),
    invoices: invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customer: (inv as any).customer,
      totalAmount: Number(inv.totalAmount),
      balanceDue: Number(inv.balanceDue),
      dueDate: inv.dueDate,
      daysOverdue: Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))),
      status: inv.status,
    })),
  };
};

const getCustomerRevenueReport = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 15;
  const offset = (page - 1) * limit;
  const sortBy = options.sortBy || 'totalPaid';
  const sortOrder = (options.sortOrder || 'desc').toUpperCase();

  const dateFilter = options.startDate && options.endDate
    ? Prisma.sql`AND p.payment_date >= ${new Date(options.startDate)}::timestamp AND p.payment_date <= ${new Date(options.endDate)}::timestamp`
    : Prisma.sql``;

  const searchFilter = options.search
    ? Prisma.sql`AND (c.full_name ILIKE ${'%' + options.search + '%'} OR c.username ILIKE ${'%' + options.search + '%'})`
    : Prisma.sql``;

  // Count
  const countResult: any[] = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT c.id)::int AS total
    FROM isp_customers c
    LEFT JOIN invoices inv ON inv.customer_id = c.id
    LEFT JOIN payments p ON p.invoice_id = inv.id AND p.status = 'COMPLETED'
    WHERE 1=1 ${searchFilter}
  `;
  const total = Number(countResult[0]?.total || 0);

  // Use dynamic sort — validated to safe columns
  const validSorts: Record<string, string> = {
    totalPaid: '"totalPaid"',
    invoiceCount: '"invoiceCount"',
    outstanding: '"outstanding"',
    fullName: '"fullName"',
  };
  const sortCol = validSorts[sortBy] || '"totalPaid"';
  const orderDir = sortOrder === 'ASC' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  const data: any[] = await prisma.$queryRaw`
    SELECT
      c.id,
      c.full_name AS "fullName",
      c.username,
      COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.amount ELSE 0 END), 0)::float AS "totalPaid",
      COUNT(DISTINCT inv.id)::int AS "invoiceCount",
      COALESCE(SUM(CASE WHEN inv.status IN ('SENT', 'PARTIALLY_PAID', 'OVERDUE') THEN inv.balance_due ELSE 0 END), 0)::float AS "outstanding"
    FROM isp_customers c
    LEFT JOIN invoices inv ON inv.customer_id = c.id
    LEFT JOIN payments p ON p.invoice_id = inv.id AND p.status = 'COMPLETED' ${dateFilter}
    WHERE 1=1 ${searchFilter}
    GROUP BY c.id, c.full_name, c.username
    ORDER BY ${Prisma.raw(sortCol)} ${orderDir}
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    data: data.map(r => ({
      id: r.id,
      fullName: r.fullName,
      username: r.username,
      totalPaid: Number(r.totalPaid || 0),
      invoiceCount: Number(r.invoiceCount || 0),
      outstanding: Number(r.outstanding || 0),
    })),
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

export default {
  getRevenueReport,
  getCollectionReport,
  getAgingReport,
  getCustomerRevenueReport,
};
