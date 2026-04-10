import prisma from '../client';
import logger from '../config/logger';

const db = prisma as any;

// ── Log a session event (connect/disconnect/timeout) ──
const logSession = async (data: {
  customerId?: string; username: string; routerId: string; eventType: string;
  sessionId?: string; ipAddress?: string; macAddress?: string; nasIp?: string;
  service?: string; uploadBytes?: number; downloadBytes?: number;
  sessionDuration?: number; disconnectReason?: string;
}) => {
  try {
    return await db.sessionLog.create({ data });
  } catch (err: any) {
    logger.error(`Failed to log session event: ${err.message}`);
  }
};

// ── Log NAT/IP assignment ──
const logNat = async (data: {
  customerId?: string; username: string; assignedIp: string;
  publicIp?: string; publicPort?: number; macAddress?: string;
  routerId: string; action: string;
}) => {
  try {
    return await db.natLog.create({ data });
  } catch (err: any) {
    logger.error(`Failed to log NAT event: ${err.message}`);
  }
};

// ── Log authentication event ──
const logAuth = async (data: {
  username: string; customerId?: string; routerId: string; eventType: string;
  ipAddress?: string; macAddress?: string; nasIp?: string;
  service?: string; failReason?: string;
}) => {
  try {
    return await db.authenticationLog.create({ data });
  } catch (err: any) {
    logger.error(`Failed to log auth event: ${err.message}`);
  }
};

// ── Query session logs with filters ──
const getSessionLogs = async (options: {
  customerId?: string; username?: string; routerId?: string; eventType?: string;
  ipAddress?: string; startDate?: string; endDate?: string;
  page?: number; limit?: number;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 50;
  const where: any = {};

  if (options.customerId) where.customerId = options.customerId;
  if (options.username) where.username = { contains: options.username, mode: 'insensitive' };
  if (options.routerId) where.routerId = options.routerId;
  if (options.eventType) where.eventType = options.eventType;
  if (options.ipAddress) where.ipAddress = { contains: options.ipAddress };
  if (options.startDate || options.endDate) {
    where.timestamp = {};
    if (options.startDate) where.timestamp.gte = new Date(options.startDate);
    if (options.endDate) where.timestamp.lte = new Date(options.endDate);
  }

  const [logs, total] = await Promise.all([
    db.sessionLog.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { timestamp: 'desc' },
      include: { customer: { select: { id: true, fullName: true, username: true, phone: true } } },
    }),
    db.sessionLog.count({ where }),
  ]);

  return { data: logs, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

// ── Query NAT logs ──
const getNatLogs = async (options: {
  customerId?: string; username?: string; assignedIp?: string; publicIp?: string;
  startDate?: string; endDate?: string; page?: number; limit?: number;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 50;
  const where: any = {};

  if (options.customerId) where.customerId = options.customerId;
  if (options.username) where.username = { contains: options.username, mode: 'insensitive' };
  if (options.assignedIp) where.assignedIp = { contains: options.assignedIp };
  if (options.publicIp) where.publicIp = { contains: options.publicIp };
  if (options.startDate || options.endDate) {
    where.timestamp = {};
    if (options.startDate) where.timestamp.gte = new Date(options.startDate);
    if (options.endDate) where.timestamp.lte = new Date(options.endDate);
  }

  const [logs, total] = await Promise.all([
    db.natLog.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { timestamp: 'desc' },
      include: { customer: { select: { id: true, fullName: true, username: true } } },
    }),
    db.natLog.count({ where }),
  ]);

  return { data: logs, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

// ── Query auth logs ──
const getAuthLogs = async (options: {
  customerId?: string; username?: string; routerId?: string; eventType?: string;
  startDate?: string; endDate?: string; page?: number; limit?: number;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 50;
  const where: any = {};

  if (options.customerId) where.customerId = options.customerId;
  if (options.username) where.username = { contains: options.username, mode: 'insensitive' };
  if (options.routerId) where.routerId = options.routerId;
  if (options.eventType) where.eventType = options.eventType;
  if (options.startDate || options.endDate) {
    where.timestamp = {};
    if (options.startDate) where.timestamp.gte = new Date(options.startDate);
    if (options.endDate) where.timestamp.lte = new Date(options.endDate);
  }

  const [logs, total] = await Promise.all([
    db.authenticationLog.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { timestamp: 'desc' },
      include: { customer: { select: { id: true, fullName: true, username: true } } },
    }),
    db.authenticationLog.count({ where }),
  ]);

  return { data: logs, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

// ── IP lookup: "who had this IP at this time?" ──
const lookupIpAtTime = async (ipAddress: string, timestamp: string) => {
  const ts = new Date(timestamp);

  // Check session logs for active session at that time
  const session = await db.sessionLog.findFirst({
    where: {
      ipAddress,
      eventType: 'CONNECT',
      timestamp: { lte: ts },
    },
    orderBy: { timestamp: 'desc' },
    include: {
      customer: {
        select: { id: true, fullName: true, username: true, phone: true, email: true, nidNumber: true, address: true },
      },
    },
  });

  // Check NAT logs
  const natEntry = await db.natLog.findFirst({
    where: {
      OR: [
        { assignedIp: ipAddress, timestamp: { lte: ts } },
        { publicIp: ipAddress, timestamp: { lte: ts } },
      ],
    },
    orderBy: { timestamp: 'desc' },
    include: {
      customer: {
        select: { id: true, fullName: true, username: true, phone: true, email: true, nidNumber: true, address: true },
      },
    },
  });

  return { session, natEntry };
};

// ── Export logs as CSV for compliance ──
const exportSessionLogs = async (startDate: string, endDate: string) => {
  const logs = await db.sessionLog.findMany({
    where: { timestamp: { gte: new Date(startDate), lte: new Date(endDate) } },
    orderBy: { timestamp: 'asc' },
    include: { customer: { select: { fullName: true, phone: true, nidNumber: true } } },
  });

  const header = 'Timestamp,Event,Username,Customer Name,NID,Phone,IP Address,MAC Address,Router,Session ID,Duration(s),Download Bytes,Upload Bytes,Disconnect Reason\n';
  const rows = logs.map((l: any) =>
    `${l.timestamp.toISOString()},${l.eventType},${l.username},"${l.customer?.fullName || ''}",${l.customer?.nidNumber || ''},${l.customer?.phone || ''},${l.ipAddress || ''},${l.macAddress || ''},${l.routerId},${l.sessionId || ''},${l.sessionDuration || ''},${l.downloadBytes || ''},${l.uploadBytes || ''},${l.disconnectReason || ''}`
  ).join('\n');

  return header + rows;
};

// ── Compliance stats ──
const getComplianceStats = async () => {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [sessionCount, natCount, authCount, oldestSession, oldestNat] = await Promise.all([
    db.sessionLog.count({ where: { timestamp: { gte: sixMonthsAgo } } }),
    db.natLog.count({ where: { timestamp: { gte: sixMonthsAgo } } }),
    db.authenticationLog.count({ where: { timestamp: { gte: sixMonthsAgo } } }),
    db.sessionLog.findFirst({ orderBy: { timestamp: 'asc' }, select: { timestamp: true } }),
    db.natLog.findFirst({ orderBy: { timestamp: 'asc' }, select: { timestamp: true } }),
  ]);

  return {
    sessionLogs: sessionCount,
    natLogs: natCount,
    authLogs: authCount,
    retentionFrom: oldestSession?.timestamp || oldestNat?.timestamp || null,
    retentionRequired: sixMonthsAgo,
  };
};

export default {
  logSession, logNat, logAuth,
  getSessionLogs, getNatLogs, getAuthLogs,
  lookupIpAtTime, exportSessionLogs, getComplianceStats,
};
