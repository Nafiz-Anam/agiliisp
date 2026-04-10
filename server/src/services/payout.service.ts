import prisma from '../client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';

const db = prisma as any;

const requestPayout = async (resellerId: string, amount: number, payoutMethod: string, accountDetails?: any, notes?: string) => {
  const reseller = await db.reseller.findUnique({ where: { id: resellerId }, select: { currentBalance: true, businessName: true } });
  if (!reseller) throw new ApiError(httpStatus.NOT_FOUND, 'Reseller not found');

  const balance = Number(reseller.currentBalance);
  if (amount <= 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Payout amount must be positive');
  if (amount > balance) throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient balance. Available: ${balance.toFixed(2)} BDT`);

  // Check no pending payout exists
  const pending = await db.resellerPayout.findFirst({ where: { resellerId, status: 'PENDING' } });
  if (pending) throw new ApiError(httpStatus.CONFLICT, 'A payout request is already pending');

  return db.resellerPayout.create({
    data: { resellerId, amount, payoutMethod, accountDetails, notes },
  });
};

const approvePayout = async (payoutId: string, processedBy: string, referenceNumber?: string) => {
  const payout = await db.resellerPayout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new ApiError(httpStatus.NOT_FOUND, 'Payout not found');
  if (payout.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, `Cannot approve ${payout.status} payout`);

  // Transaction: update payout + deduct balance
  const [updatedPayout] = await prisma.$transaction([
    db.resellerPayout.update({
      where: { id: payoutId },
      data: { status: 'COMPLETED', processedAt: new Date(), processedBy, referenceNumber },
    }),
    db.reseller.update({
      where: { id: payout.resellerId },
      data: { currentBalance: { decrement: Number(payout.amount) } },
    }),
  ]);

  logger.info(`Payout ${payoutId} approved — ${Number(payout.amount)} BDT to reseller ${payout.resellerId}`);
  return updatedPayout;
};

const rejectPayout = async (payoutId: string, processedBy: string, rejectionReason: string) => {
  const payout = await db.resellerPayout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new ApiError(httpStatus.NOT_FOUND, 'Payout not found');
  if (payout.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, `Cannot reject ${payout.status} payout`);

  return db.resellerPayout.update({
    where: { id: payoutId },
    data: { status: 'REJECTED', processedAt: new Date(), processedBy, rejectionReason },
  });
};

const getPayouts = async (options: { resellerId?: string; status?: string; page?: number; limit?: number }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const where: any = {};
  if (options.resellerId) where.resellerId = options.resellerId;
  if (options.status) where.status = options.status;

  const [payouts, total] = await Promise.all([
    db.resellerPayout.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { requestedAt: 'desc' },
      include: {
        reseller: { select: { id: true, businessName: true, level: true } },
        processor: { select: { id: true, name: true } },
      },
    }),
    db.resellerPayout.count({ where }),
  ]);

  return { data: payouts, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const getPayoutSummary = async (resellerId: string) => {
  const [totalPaid, pending] = await Promise.all([
    db.resellerPayout.aggregate({ where: { resellerId, status: 'COMPLETED' }, _sum: { amount: true } }),
    db.resellerPayout.aggregate({ where: { resellerId, status: 'PENDING' }, _sum: { amount: true }, _count: true }),
  ]);

  const reseller = await db.reseller.findUnique({ where: { id: resellerId }, select: { currentBalance: true } });

  return {
    totalPaidOut: Number(totalPaid._sum.amount || 0),
    pendingAmount: Number(pending._sum.amount || 0),
    pendingCount: pending._count || 0,
    currentBalance: Number(reseller?.currentBalance || 0),
  };
};

export default { requestPayout, approvePayout, rejectPayout, getPayouts, getPayoutSummary };
