import prisma from '../client';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { Prisma } from '@prisma/client';

const db = prisma as any;

const createCollector = async (body: any) => {
  return db.collector.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      zoneId: body.zoneId || null,
      userId: body.userId || null,
      commissionRate: body.commissionRate ? new Prisma.Decimal(body.commissionRate) : null,
    },
  });
};

const getCollectors = async (options: { zoneId?: string; isActive?: string }) => {
  const where: any = {};
  if (options.zoneId) where.zoneId = options.zoneId;
  if (options.isActive !== undefined) where.isActive = options.isActive === 'true';

  return db.collector.findMany({
    where,
    include: {
      zone: { select: { id: true, name: true } },
      _count: { select: { customers: true, collections: true } },
    },
    orderBy: { name: 'asc' },
  });
};

const getCollectorById = async (id: string) => {
  const collector = await db.collector.findUnique({
    where: { id },
    include: {
      zone: { select: { id: true, name: true } },
      _count: { select: { customers: true, collections: true } },
    },
  });
  if (!collector) throw new ApiError(httpStatus.NOT_FOUND, 'Collector not found');
  return collector;
};

const updateCollector = async (id: string, body: any) => {
  await getCollectorById(id);
  return db.collector.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.phone && { phone: body.phone }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.zoneId !== undefined && { zoneId: body.zoneId }),
      ...(body.commissionRate !== undefined && { commissionRate: body.commissionRate ? new Prisma.Decimal(body.commissionRate) : null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  });
};

const deleteCollector = async (id: string) => {
  const c = await getCollectorById(id);
  if (c._count.customers > 0) throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete collector with assigned customers');
  return db.collector.delete({ where: { id } });
};

// ── Collection (payments collected by field agents) ──

const recordCollection = async (body: any) => {
  return db.collection.create({
    data: {
      collectorId: body.collectorId,
      customerId: body.customerId,
      invoiceId: body.invoiceId || null,
      amount: new Prisma.Decimal(body.amount),
      paymentMethod: body.paymentMethod || 'CASH',
      referenceNo: body.referenceNo || null,
      notes: body.notes || null,
    },
  });
};

const getCollections = async (options: {
  collectorId?: string; status?: string; startDate?: string; endDate?: string;
  page?: number; limit?: number;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const where: any = {};
  if (options.collectorId) where.collectorId = options.collectorId;
  if (options.status) where.status = options.status;
  if (options.startDate || options.endDate) {
    where.collectedAt = {};
    if (options.startDate) where.collectedAt.gte = new Date(options.startDate);
    if (options.endDate) where.collectedAt.lte = new Date(options.endDate);
  }

  const [collections, total] = await Promise.all([
    db.collection.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { collectedAt: 'desc' },
      include: { collector: { select: { id: true, name: true } } },
    }),
    db.collection.count({ where }),
  ]);

  return { data: collections, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const reconcileCollection = async (id: string, userId: string) => {
  return db.collection.update({
    where: { id },
    data: { status: 'RECONCILED', reconciledAt: new Date(), reconciledBy: userId },
  });
};

const getCollectorSummary = async (collectorId: string, startDate?: string, endDate?: string) => {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const [totalCollected, pendingCount, reconciledCount] = await Promise.all([
    db.collection.aggregate({
      where: { collectorId, ...(Object.keys(dateFilter).length && { collectedAt: dateFilter }) },
      _sum: { amount: true },
      _count: true,
    }),
    db.collection.count({ where: { collectorId, status: 'PENDING' } }),
    db.collection.count({ where: { collectorId, status: 'RECONCILED' } }),
  ]);

  return {
    totalCollected: Number(totalCollected._sum.amount || 0),
    totalCount: totalCollected._count,
    pendingCount,
    reconciledCount,
  };
};

export default {
  createCollector, getCollectors, getCollectorById, updateCollector, deleteCollector,
  recordCollection, getCollections, reconcileCollection, getCollectorSummary,
};
