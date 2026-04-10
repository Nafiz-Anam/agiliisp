import prisma from '../client';
import logger from '../config/logger';

const db = prisma as any;

/**
 * Walk up the reseller hierarchy chain from a given reseller.
 * Returns array from bottom to top: [L3, L2, L1]
 */
const getResellerChain = async (resellerId: string): Promise<any[]> => {
  const chain: any[] = [];
  let currentId: string | null = resellerId;
  let depth = 0;

  while (currentId && depth < 4) { // max 4 iterations as safety
    const reseller = await db.reseller.findUnique({
      where: { id: currentId },
      select: {
        id: true, businessName: true, level: true,
        commissionRate: true, currentBalance: true,
        parentResellerId: true,
      },
    });
    if (!reseller) break;
    chain.push(reseller);
    currentId = reseller.parentResellerId;
    depth++;
  }

  return chain;
};

/**
 * Calculate and record commissions for all resellers in the chain when a payment is made.
 *
 * Each reseller in the chain gets their own commissionRate % of the payment amount.
 * The direct reseller's sourceType = PAYMENT, parents' sourceType = CASCADED.
 */
const calculateAndRecordCommissions = async (
  paymentId: string,
  invoiceId: string,
  customerId: string,
  resellerId: string,
  paymentAmount: number,
): Promise<void> => {
  try {
    const chain = await getResellerChain(resellerId);
    if (chain.length === 0) return;

    // Skip entirely if no reseller in the chain has commission enabled
    const hasAnyCommission = chain.some(r => Number(r.commissionRate) > 0);
    if (!hasAnyCommission) return;

    // Build all operations in a transaction
    const operations: any[] = [];

    for (let i = 0; i < chain.length; i++) {
      const reseller = chain[i];
      const rate = Number(reseller.commissionRate);
      const commissionAmount = Math.round((paymentAmount * rate / 100) * 100) / 100; // round to 2 decimals

      if (commissionAmount <= 0) continue;

      // Create commission record
      operations.push(
        db.commissionRecord.create({
          data: {
            resellerId: reseller.id,
            paymentId,
            invoiceId,
            customerId,
            sourceResellerId: i === 0 ? null : chain[0].id, // the direct reseller
            sourceType: i === 0 ? 'PAYMENT' : 'CASCADED',
            commissionRate: rate,
            baseAmount: paymentAmount,
            commissionAmount,
            resellerLevel: reseller.level,
          },
        })
      );

      // Atomic increment of reseller balance
      operations.push(
        db.reseller.update({
          where: { id: reseller.id },
          data: { currentBalance: { increment: commissionAmount } },
        })
      );
    }

    // Execute all in transaction
    if (operations.length > 0) {
      await prisma.$transaction(operations);
      logger.info(`Commission: recorded ${chain.length} commission(s) for payment ${paymentId} — amount ${paymentAmount}`);
    }
  } catch (err: any) {
    logger.error(`Commission calculation failed for payment ${paymentId}: ${err.message}`);
  }
};

/**
 * Get commission history for a reseller
 */
const getCommissionHistory = async (resellerId: string, options: {
  page?: number; limit?: number; startDate?: string; endDate?: string;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 30;
  const where: any = { resellerId };

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = new Date(options.startDate);
    if (options.endDate) where.createdAt.lte = new Date(options.endDate);
  }

  const [records, total] = await Promise.all([
    db.commissionRecord.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.commissionRecord.count({ where }),
  ]);

  return { data: records, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

/**
 * Get commission summary for a reseller
 */
const getCommissionSummary = async (resellerId: string) => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [totalEarned, thisMonth, lastMonth] = await Promise.all([
    db.commissionRecord.aggregate({ where: { resellerId }, _sum: { commissionAmount: true } }),
    db.commissionRecord.aggregate({ where: { resellerId, createdAt: { gte: thisMonthStart } }, _sum: { commissionAmount: true } }),
    db.commissionRecord.aggregate({ where: { resellerId, createdAt: { gte: lastMonthStart, lt: thisMonthStart } }, _sum: { commissionAmount: true } }),
  ]);

  const reseller = await db.reseller.findUnique({
    where: { id: resellerId },
    select: { currentBalance: true, commissionRate: true },
  });

  return {
    totalEarned: Number(totalEarned._sum.commissionAmount || 0),
    thisMonth: Number(thisMonth._sum.commissionAmount || 0),
    lastMonth: Number(lastMonth._sum.commissionAmount || 0),
    currentBalance: Number(reseller?.currentBalance || 0),
    commissionRate: Number(reseller?.commissionRate || 0),
  };
};

export default { getResellerChain, calculateAndRecordCommissions, getCommissionHistory, getCommissionSummary };
