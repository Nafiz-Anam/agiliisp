import prisma from '../client';
import logger from '../config/logger';
import smsService from './sms.service';

const db = prisma as any;

const createBulkMessage = async (data: any, userId: string) => {
  return db.bulkMessage.create({
    data: { ...data, createdBy: userId },
  });
};

const getBulkMessages = async (options: { page?: number; limit?: number }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;

  const [items, total] = await Promise.all([
    db.bulkMessage.findMany({
      skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } } },
    }),
    db.bulkMessage.count(),
  ]);

  return { data: items, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const getBulkMessageById = async (id: string) => {
  return db.bulkMessage.findUnique({
    where: { id },
    include: { creator: { select: { id: true, name: true } } },
  });
};

/**
 * Resolve filters to customer list and get count preview
 */
const previewRecipients = async (filters: any) => {
  const where = buildCustomerWhere(filters);
  const count = await prisma.ispCustomer.count({ where });
  return { count };
};

/**
 * Send bulk message — processes in batches
 */
const sendBulkMessage = async (id: string) => {
  const msg = await db.bulkMessage.findUnique({ where: { id } });
  if (!msg) throw new Error('Bulk message not found');

  const where = buildCustomerWhere(msg.filters);
  const customers = await prisma.ispCustomer.findMany({
    where,
    select: { id: true, phone: true, email: true, fullName: true },
  });

  await db.bulkMessage.update({
    where: { id },
    data: { status: 'SENDING', totalCount: customers.length, startedAt: new Date() },
  });

  let sent = 0;
  let failed = 0;
  const batchSize = 50;

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    for (const c of batch) {
      try {
        const channel = msg.channel;
        if ((channel === 'SMS' || channel === 'BOTH') && c.phone) {
          await smsService.sendSms(c.phone, msg.message, 'BULK');
        }
        // Email would go here
        sent++;
      } catch {
        failed++;
      }
    }

    // Update progress
    await db.bulkMessage.update({
      where: { id },
      data: { sentCount: sent, failedCount: failed },
    });

    // Small delay between batches to avoid rate limits
    if (i + batchSize < customers.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  await db.bulkMessage.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), sentCount: sent, failedCount: failed },
  });

  logger.info(`Bulk message ${id}: sent ${sent}, failed ${failed} of ${customers.length}`);
  return { sent, failed, total: customers.length };
};

function buildCustomerWhere(filters: any): any {
  const where: any = { isActive: true };
  if (filters?.status) where.status = filters.status;
  if (filters?.routerId) where.routerId = filters.routerId;
  if (filters?.zoneId) where.zoneId = filters.zoneId;
  if (filters?.customerIds?.length) where.id = { in: filters.customerIds };
  return where;
}

export default { createBulkMessage, getBulkMessages, getBulkMessageById, previewRecipients, sendBulkMessage };
