import prisma from '../client';
import logger from '../config/logger';
import smsService from './sms.service';

const db = prisma as any;

const createAnnouncement = async (data: any, userId: string) => {
  const announcement = await db.announcement.create({
    data: { ...data, createdBy: userId },
  });

  // Auto-notify if created as ACTIVE
  if (data.status === 'ACTIVE' && data.notifyVia) {
    notifyAffectedCustomers(announcement.id).catch(() => {});
  }

  return announcement;
};

const getAnnouncements = async (options: { page?: number; limit?: number; type?: string; status?: string }) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const where: any = {};
  if (options.type) where.type = options.type;
  if (options.status) where.status = options.status;

  const [items, total] = await Promise.all([
    db.announcement.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } } },
    }),
    db.announcement.count({ where }),
  ]);

  return { data: items, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

const getAnnouncementById = async (id: string) => {
  return db.announcement.findUnique({
    where: { id },
    include: { creator: { select: { id: true, name: true } } },
  });
};

const updateAnnouncement = async (id: string, data: any) => {
  const updated = await db.announcement.update({ where: { id }, data });

  // Trigger notifications if just activated
  if (data.status === 'ACTIVE' && data.notifyVia) {
    notifyAffectedCustomers(id).catch(() => {});
  }

  return updated;
};

const resolveAnnouncement = async (id: string) => {
  const announcement = await db.announcement.update({
    where: { id },
    data: { status: 'RESOLVED', endTime: new Date() },
  });

  // Optionally notify resolution
  if (announcement.notifyVia) {
    const customers = await prisma.ispCustomer.findMany({
      where: { routerId: { in: announcement.affectedRouterIds }, status: 'ACTIVE', phone: { not: null } },
      select: { phone: true },
    });

    for (const c of customers) {
      if (c.phone) {
        smsService.sendSms(c.phone, `Service restored: ${announcement.title}. Sorry for the inconvenience. — AgiliOSP`, 'OUTAGE_RESOLVED').catch(() => {});
      }
    }
  }

  return announcement;
};

const notifyAffectedCustomers = async (announcementId: string) => {
  const announcement = await db.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) return;

  const customers = await prisma.ispCustomer.findMany({
    where: { routerId: { in: announcement.affectedRouterIds }, status: 'ACTIVE' },
    select: { id: true, phone: true, email: true, fullName: true },
  });

  let notified = 0;
  for (const c of customers) {
    const via = announcement.notifyVia || 'SMS';
    if ((via === 'SMS' || via === 'BOTH') && c.phone) {
      await smsService.sendSms(c.phone, `${announcement.title}: ${announcement.message} — AgiliOSP`, 'OUTAGE').catch(() => {});
      notified++;
    }
    // Email would go here with emailService
  }

  await db.announcement.update({ where: { id: announcementId }, data: { notifiedCount: notified } });
  logger.info(`Announcement ${announcementId}: notified ${notified} customers`);
};

const getActiveAnnouncements = async () => {
  return db.announcement.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
};

const getActiveAnnouncementsForRouter = async (routerId: string) => {
  return db.announcement.findMany({
    where: { status: 'ACTIVE', affectedRouterIds: { has: routerId } },
    orderBy: { createdAt: 'desc' },
  });
};

const detectOutage = async (routerId: string) => {
  // Check if there's already an active outage for this router
  const existing = await db.announcement.findFirst({
    where: { type: 'OUTAGE', status: 'ACTIVE', affectedRouterIds: { has: routerId } },
  });
  if (existing) return existing;

  const router = await prisma.router.findUnique({ where: { id: routerId }, select: { name: true } });

  const announcement = await db.announcement.create({
    data: {
      title: `Service Outage — ${router?.name || 'Router'}`,
      message: `We are experiencing connectivity issues with ${router?.name || 'a router'}. Our team is working to resolve this.`,
      type: 'OUTAGE',
      status: 'ACTIVE',
      affectedRouterIds: [routerId],
      startTime: new Date(),
      notifyVia: 'SMS',
    },
  });

  // Auto-notify
  notifyAffectedCustomers(announcement.id).catch(() => {});
  logger.info(`Auto-created outage announcement for router ${router?.name} (${routerId})`);
  return announcement;
};

export default {
  createAnnouncement, getAnnouncements, getAnnouncementById, updateAnnouncement,
  resolveAnnouncement, notifyAffectedCustomers,
  getActiveAnnouncements, getActiveAnnouncementsForRouter, detectOutage,
};
