import httpStatus from 'http-status';
import { RouterLog, RouterLogType, LogSeverity, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import logger from '../config/logger';
import complianceLogService from './complianceLog.service';

// MikroTik log entry from API
interface MikrotikLogEntry {
  '.id': string;
  time: string;
  topics: string;
  message: string;
}

/**
 * Router Log Service - Fetch and manage logs from MikroTik routers
 */
class RouterLogService {
  /**
   * Fetch logs from MikroTik router
   */
  async fetchLogsFromRouter(
    routerId: string,
    options: {
      logType?: RouterLogType;
      limit?: number;
      since?: Date;
    } = {}
  ): Promise<RouterLog[]> {
    const router = await prisma.router.findUnique({
      where: { id: routerId },
    });

    if (!router) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Router not found');
    }

    try {
      const protocol = router.useSSL ? 'https' : 'http';
      const url = `${protocol}://${router.host}:${router.port}/rest/log`;

      const auth = Buffer.from(`${router.username}:${router.password}`).toString('base64');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const logs = (await response.json()) as MikrotikLogEntry[];
      const savedLogs: RouterLog[] = [];

      for (const logEntry of logs.slice(0, options.limit || 100)) {
        try {
          const parsedLog = await this.parseAndSaveLog(routerId, logEntry);
          if (parsedLog) {
            savedLogs.push(parsedLog);
          }
        } catch (error) {
          logger.error('Failed to parse log entry:', error);
        }
      }

      return savedLogs;
    } catch (error: any) {
      logger.error(`Failed to fetch logs from router ${router.name}:`, error);
      throw new ApiError(httpStatus.BAD_GATEWAY, `Failed to fetch logs: ${error.message}`);
    }
  }

  /**
   * Parse MikroTik log entry and save to database
   */
  private async parseAndSaveLog(
    routerId: string,
    logEntry: MikrotikLogEntry
  ): Promise<RouterLog | null> {
    // Determine log type from topics
    const topics = logEntry.topics.toLowerCase();
    let logType: RouterLogType = RouterLogType.SYSTEM;
    let severity: LogSeverity = LogSeverity.INFO;

    if (topics.includes('ppp')) logType = RouterLogType.PPPOE;
    else if (topics.includes('firewall')) logType = RouterLogType.FIREWALL;
    else if (topics.includes('dhcp')) logType = RouterLogType.DHCP;
    else if (topics.includes('dns')) logType = RouterLogType.DNS;
    else if (topics.includes('hotspot')) logType = RouterLogType.HOTSPOT;
    else if (topics.includes('wireless')) logType = RouterLogType.WIRELESS;
    else if (topics.includes('traffic')) logType = RouterLogType.TRAFFIC;

    // Determine severity from message content
    const message = logEntry.message.toLowerCase();
    if (message.includes('error') || message.includes('failed')) severity = LogSeverity.ERROR;
    else if (message.includes('warning')) severity = LogSeverity.WARNING;
    else if (message.includes('critical')) severity = LogSeverity.CRITICAL;
    else if (message.includes('debug')) severity = LogSeverity.DEBUG;

    // Check for existing log to avoid duplicates
    const existingLog = await prisma.routerLog.findFirst({
      where: {
        routerId,
        message: logEntry.message,
        timestamp: {
          gte: new Date(Date.now() - 60 * 1000), // Within last minute
        },
      },
    });

    if (existingLog) {
      return null;
    }

    // Parse traffic data if available
    let trafficData: any = {};
    if (logType === RouterLogType.TRAFFIC || message.includes('bytes')) {
      const bytesMatch = message.match(/(\d+)\s*bytes/i);
      if (bytesMatch) {
        trafficData.bytes = parseInt(bytesMatch[1], 10);
      }
    }

    // Find associated customer by username
    let customerId: string | undefined;
    let username: string | undefined;

    // Try to extract username from PPPoE logs
    const pppMatch = message.match(/user\s*[:\s]\s*(\w+)/i);
    if (pppMatch) {
      username = pppMatch[1];
      const customer = await prisma.ispCustomer.findFirst({
        where: { username },
        select: { id: true },
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    // ── Compliance logging: capture PPPoE events ──
    if (logType === RouterLogType.PPPOE && username) {
      const ipMatch = logEntry.message.match(/(\d+\.\d+\.\d+\.\d+)/);
      const macMatch = logEntry.message.match(/([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/);
      const ip = ipMatch?.[0] || undefined;
      const mac = macMatch?.[0] || undefined;

      const router = await prisma.router.findUnique({ where: { id: routerId }, select: { host: true } });
      const nasIp = router?.host || undefined;

      if (message.includes('logged in') || message.includes('connected')) {
        complianceLogService.logSession({ customerId, username, routerId, eventType: 'CONNECT', ipAddress: ip, macAddress: mac, nasIp, service: 'pppoe' }).catch(() => {});
        complianceLogService.logAuth({ username, customerId, routerId, eventType: 'LOGIN_SUCCESS', ipAddress: ip, macAddress: mac, nasIp, service: 'pppoe' }).catch(() => {});
        if (ip) complianceLogService.logNat({ customerId, username, assignedIp: ip, macAddress: mac, routerId, action: 'ASSIGN' }).catch(() => {});
      } else if (message.includes('logged out') || message.includes('disconnected') || message.includes('disconnecting')) {
        const durationMatch = logEntry.message.match(/(\d+)h(\d+)m(\d+)s/);
        const duration = durationMatch ? parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3]) : undefined;
        const bytesInMatch = logEntry.message.match(/(\d+)\s*bytes?\s*in/i);
        const bytesOutMatch = logEntry.message.match(/(\d+)\s*bytes?\s*out/i);
        complianceLogService.logSession({ customerId, username, routerId, eventType: 'DISCONNECT', ipAddress: ip, macAddress: mac, nasIp, service: 'pppoe', sessionDuration: duration, downloadBytes: bytesInMatch ? parseInt(bytesInMatch[1]) : undefined, uploadBytes: bytesOutMatch ? parseInt(bytesOutMatch[1]) : undefined, disconnectReason: 'user-request' }).catch(() => {});
        if (ip) complianceLogService.logNat({ customerId, username, assignedIp: ip, macAddress: mac, routerId, action: 'RELEASE' }).catch(() => {});
      } else if (message.includes('timeout')) {
        complianceLogService.logSession({ customerId, username, routerId, eventType: 'TIMEOUT', ipAddress: ip, macAddress: mac, nasIp, service: 'pppoe', disconnectReason: 'session-timeout' }).catch(() => {});
        complianceLogService.logAuth({ username, customerId, routerId, eventType: 'SESSION_TIMEOUT', ipAddress: ip, macAddress: mac, nasIp, service: 'pppoe' }).catch(() => {});
      } else if (message.includes('auth') && (message.includes('fail') || message.includes('error'))) {
        complianceLogService.logSession({ customerId, username, routerId, eventType: 'AUTH_FAIL', macAddress: mac, nasIp, service: 'pppoe' }).catch(() => {});
        complianceLogService.logAuth({ username, customerId, routerId, eventType: 'LOGIN_FAIL', macAddress: mac, nasIp, service: 'pppoe', failReason: logEntry.message }).catch(() => {});
      }
    }

    // Parse timestamp
    const timestamp = this.parseMikrotikTime(logEntry.time);

    return prisma.routerLog.create({
      data: {
        routerId,
        logType,
        severity,
        timestamp,
        message: logEntry.message,
        topic: logEntry.topics,
        username,
        customerId,
        bytesIn: trafficData.bytes,
        rawData: logEntry as any,
      },
    });
  }

  /**
   * Parse MikroTik time format
   */
  private parseMikrotikTime(timeStr: string): Date {
    // MikroTik time is typically in format "HH:MM:SS" or includes date
    // For simplicity, use current date with the time
    const now = new Date();
    const timeParts = timeStr.split(':');

    if (timeParts.length === 3) {
      now.setHours(parseInt(timeParts[0], 10));
      now.setMinutes(parseInt(timeParts[1], 10));
      now.setSeconds(parseInt(timeParts[2], 10));
    }

    return now;
  }

  /**
   * Get router logs with filters
   */
  async getRouterLogs(options: {
    routerId?: string;
    customerId?: string;
    logType?: RouterLogType;
    severity?: LogSeverity;
    username?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const {
      routerId,
      customerId,
      logType,
      severity,
      username,
      startDate,
      endDate,
      search,
    } = options;
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 50;

    const where: Prisma.RouterLogWhereInput = {};

    if (routerId) where.routerId = routerId;
    if (customerId) where.customerId = customerId;
    if (logType) where.logType = logType;
    if (severity) where.severity = severity;
    if (username) where.username = { contains: username, mode: 'insensitive' };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.routerLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          router: {
            select: {
              id: true,
              name: true,
            },
          },
          customer: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      }),
      prisma.routerLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    };
  }

  /**
   * Get logs for a specific customer
   */
  async getCustomerLogs(customerId: string, options: { limit?: number; days?: number } = {}) {
    const { limit = 100, days = 7 } = options;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.routerLog.findMany({
      where: {
        customerId,
        timestamp: { gte: startDate },
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        router: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get traffic statistics for a customer
   */
  async getCustomerTrafficStats(
    customerId: string,
    periodType: 'HOURLY' | 'DAILY' | 'MONTHLY' = 'DAILY',
    days: number = 30
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await prisma.trafficStat.findMany({
      where: {
        customerId,
        periodType,
        periodStart: { gte: startDate },
      },
      orderBy: { periodStart: 'asc' },
    });

    // If no stats exist, calculate from router logs
    if (stats.length === 0) {
      return this.calculateTrafficStatsFromLogs(customerId, periodType, days);
    }

    return stats;
  }

  /**
   * Calculate traffic statistics from router logs
   */
  private async calculateTrafficStatsFromLogs(
    customerId: string,
    periodType: 'HOURLY' | 'DAILY' | 'MONTHLY',
    days: number
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate logs by period
    const logs = await prisma.routerLog.findMany({
      where: {
        customerId,
        logType: RouterLogType.TRAFFIC,
        timestamp: { gte: startDate },
      },
    });

    // Group by period
    const grouped = new Map<string, typeof logs>();

    logs.forEach((log) => {
      const date = new Date(log.timestamp);
      let key: string;

      if (periodType === 'HOURLY') {
        key = `${date.toISOString().split('T')[0]}_${date.getHours()}`;
      } else if (periodType === 'DAILY') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}_${date.getMonth() + 1}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(log);
    });

    // Calculate stats for each period
    const stats = Array.from(grouped.entries()).map(([key, periodLogs]) => {
      const totalBytesIn = periodLogs.reduce(
        (sum, log) => sum + (log.bytesIn ?? BigInt(0)),
        BigInt(0)
      );
      const totalBytesOut = periodLogs.reduce(
        (sum, log) => sum + (log.bytesOut ?? BigInt(0)),
        BigInt(0)
      );

      return {
        period: key,
        totalBytesIn,
        totalBytesOut,
        totalPackets: periodLogs.length,
        logCount: periodLogs.length,
      };
    });

    return stats;
  }

  /**
   * Clean up old logs based on retention policy
   */
  async cleanupOldLogs(): Promise<{ deletedRouterLogs: number; deletedAppLogs: number }> {
    const retentionPolicies = await prisma.logRetentionPolicy.findMany({
      where: { isActive: true },
    });

    let deletedRouterLogs = 0;
    let deletedAppLogs = 0;

    for (const policy of retentionPolicies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      if (policy.logType === 'ROUTER_TRAFFIC' || policy.logType === 'ROUTER_SYSTEM') {
        const result = await prisma.routerLog.deleteMany({
          where: {
            timestamp: { lt: cutoffDate },
            isProcessed: true,
          },
        });
        deletedRouterLogs += result.count;
      } else if (policy.logType === 'APP_SYSTEM') {
        const result = await prisma.appSystemLog.deleteMany({
          where: {
            timestamp: { lt: cutoffDate },
            isRead: true,
          },
        });
        deletedAppLogs += result.count;
      }
    }

    return { deletedRouterLogs, deletedAppLogs };
  }

  /**
   * Mark logs as processed
   */
  async markLogsAsProcessed(logIds: string[]): Promise<void> {
    await prisma.routerLog.updateMany({
      where: { id: { in: logIds } },
      data: {
        isProcessed: true,
        processedAt: new Date(),
      },
    });
  }
}

export default new RouterLogService();
