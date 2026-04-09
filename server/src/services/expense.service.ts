import prisma from '../client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';

const db = prisma as any;

const createExpense = async (body: any, userId?: string) => {
  return db.expense.create({
    data: {
      category: body.category,
      amount: new Prisma.Decimal(body.amount),
      description: body.description,
      vendor: body.vendor || null,
      referenceNo: body.referenceNo || null,
      expenseDate: new Date(body.expenseDate),
      paymentMethod: body.paymentMethod || null,
      isRecurring: body.isRecurring || false,
      recurringDay: body.recurringDay || null,
      notes: body.notes || null,
      createdBy: userId || null,
    },
  });
};

const getExpenses = async (options: {
  page?: number; limit?: number; search?: string;
  category?: string; startDate?: string; endDate?: string;
  sortBy?: string; sortOrder?: 'asc' | 'desc';
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 15;
  const where: any = {};

  if (options.category) where.category = options.category;
  if (options.search) {
    where.OR = [
      { description: { contains: options.search, mode: 'insensitive' } },
      { vendor: { contains: options.search, mode: 'insensitive' } },
      { referenceNo: { contains: options.search, mode: 'insensitive' } },
    ];
  }
  if (options.startDate || options.endDate) {
    where.expenseDate = {};
    if (options.startDate) where.expenseDate.gte = new Date(options.startDate);
    if (options.endDate) where.expenseDate.lte = new Date(options.endDate);
  }

  const sortBy = options.sortBy || 'expenseDate';
  const sortOrder = options.sortOrder || 'desc';

  const [expenses, total] = await Promise.all([
    db.expense.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { creator: { select: { id: true, name: true } } },
    }),
    db.expense.count({ where }),
  ]);

  return {
    data: expenses,
    meta: { page, limit, totalPages: Math.ceil(total / limit), total },
  };
};

const getExpenseById = async (id: string) => {
  const expense = await db.expense.findUnique({
    where: { id },
    include: { creator: { select: { id: true, name: true } } },
  });
  if (!expense) throw new ApiError(httpStatus.NOT_FOUND, 'Expense not found');
  return expense;
};

const updateExpense = async (id: string, body: any) => {
  await getExpenseById(id);
  return db.expense.update({
    where: { id },
    data: {
      ...(body.category && { category: body.category }),
      ...(body.amount !== undefined && { amount: new Prisma.Decimal(body.amount) }),
      ...(body.description && { description: body.description }),
      ...(body.vendor !== undefined && { vendor: body.vendor }),
      ...(body.referenceNo !== undefined && { referenceNo: body.referenceNo }),
      ...(body.expenseDate && { expenseDate: new Date(body.expenseDate) }),
      ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
      ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
      ...(body.recurringDay !== undefined && { recurringDay: body.recurringDay }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });
};

const deleteExpense = async (id: string) => {
  await getExpenseById(id);
  return db.expense.delete({ where: { id } });
};

const getExpenseSummary = async (startDate?: string, endDate?: string) => {
  const dateFilter: any = {};
  if (startDate || endDate) {
    dateFilter.expenseDate = {};
    if (startDate) dateFilter.expenseDate.gte = new Date(startDate);
    if (endDate) dateFilter.expenseDate.lte = new Date(endDate);
  }

  // By category
  const byCategory: any[] = await prisma.$queryRaw`
    SELECT category, SUM(amount)::float AS total, COUNT(*)::int AS count
    FROM expenses
    WHERE (${'1'} = '1')
    ${startDate ? Prisma.sql`AND expense_date >= ${new Date(startDate)}::timestamp` : Prisma.sql``}
    ${endDate ? Prisma.sql`AND expense_date <= ${new Date(endDate)}::timestamp` : Prisma.sql``}
    GROUP BY category
    ORDER BY total DESC
  `;

  // Monthly trend
  const monthlyTrend: any[] = await prisma.$queryRaw`
    SELECT date_trunc('month', expense_date) AS period,
           SUM(amount)::float AS total
    FROM expenses
    WHERE (${'1'} = '1')
    ${startDate ? Prisma.sql`AND expense_date >= ${new Date(startDate)}::timestamp` : Prisma.sql``}
    ${endDate ? Prisma.sql`AND expense_date <= ${new Date(endDate)}::timestamp` : Prisma.sql``}
    GROUP BY period
    ORDER BY period ASC
  `;

  const totalExpenses = byCategory.reduce((s, r) => s + Number(r.total), 0);

  return {
    totalExpenses,
    byCategory: byCategory.map(r => ({ category: r.category, total: Number(r.total), count: Number(r.count) })),
    monthlyTrend: monthlyTrend.map(r => ({ period: r.period, total: Number(r.total) })),
  };
};

const getProfitLoss = async (startDate: string, endDate: string) => {
  // Revenue: sum of completed payments
  const revenueResult: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(amount), 0)::float AS total
    FROM payments
    WHERE status = 'COMPLETED'
      AND payment_date >= ${new Date(startDate)}::timestamp
      AND payment_date <= ${new Date(endDate)}::timestamp
  `;

  // Expenses: sum of all expenses
  const expenseResult: any[] = await prisma.$queryRaw`
    SELECT COALESCE(SUM(amount), 0)::float AS total
    FROM expenses
    WHERE expense_date >= ${new Date(startDate)}::timestamp
      AND expense_date <= ${new Date(endDate)}::timestamp
  `;

  // Monthly breakdown
  const monthly: any[] = await prisma.$queryRaw`
    SELECT
      m.month AS period,
      COALESCE(r.revenue, 0)::float AS revenue,
      COALESCE(e.expenses, 0)::float AS expenses
    FROM (
      SELECT generate_series(
        date_trunc('month', ${new Date(startDate)}::timestamp),
        date_trunc('month', ${new Date(endDate)}::timestamp),
        '1 month'::interval
      ) AS month
    ) m
    LEFT JOIN (
      SELECT date_trunc('month', payment_date) AS month, SUM(amount) AS revenue
      FROM payments WHERE status = 'COMPLETED'
        AND payment_date >= ${new Date(startDate)}::timestamp
        AND payment_date <= ${new Date(endDate)}::timestamp
      GROUP BY 1
    ) r ON r.month = m.month
    LEFT JOIN (
      SELECT date_trunc('month', expense_date) AS month, SUM(amount) AS expenses
      FROM expenses
      WHERE expense_date >= ${new Date(startDate)}::timestamp
        AND expense_date <= ${new Date(endDate)}::timestamp
      GROUP BY 1
    ) e ON e.month = m.month
    ORDER BY m.month ASC
  `;

  // Expense breakdown by category for the period
  const expenseByCategory: any[] = await prisma.$queryRaw`
    SELECT category, SUM(amount)::float AS total
    FROM expenses
    WHERE expense_date >= ${new Date(startDate)}::timestamp
      AND expense_date <= ${new Date(endDate)}::timestamp
    GROUP BY category ORDER BY total DESC
  `;

  const totalRevenue = Number(revenueResult[0]?.total || 0);
  const totalExpense = Number(expenseResult[0]?.total || 0);

  return {
    totalRevenue,
    totalExpenses: totalExpense,
    netProfit: totalRevenue - totalExpense,
    profitMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalExpense) / totalRevenue) * 100) : 0,
    monthly: monthly.map(r => ({
      period: r.period,
      revenue: Number(r.revenue),
      expenses: Number(r.expenses),
      profit: Number(r.revenue) - Number(r.expenses),
    })),
    expenseByCategory: expenseByCategory.map(r => ({ category: r.category, total: Number(r.total) })),
  };
};

export default { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense, getExpenseSummary, getProfitLoss };
