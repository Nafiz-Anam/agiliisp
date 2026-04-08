import { AppSystemLog, LogSeverity, Prisma } from '@prisma/client';
import prisma from '../client';
import logger from '../config/logger';

/**
 * App System Log Service - For admin monitoring and debugging
 */
class AppSystemLogService {
  /**
   * Create a system log entry
   */
  async createLog(data: {
    level: LogSeverity;
    category: string;
    component: string;
    message: string;
    details?: any;
    requestId?: string;
    userId?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    errorCode?: string;
    errorStack?: string;
    entityType?: string;
    entityId?: string;
    isAlert?: boolean;
  }): Promise<AppSystemLog> {
    return prisma.appSystemLog.create({
      data: {
        ...data,
        isAlert: data.isAlert || data.level === LogSeverity.ERROR || data.level === LogSeverity.CRITICAL,
      },
    });
  }

  /**
   * Log an info message
   */
  async info(
    category: string,
    component: string,
    message: string,
    details?: any,
    context?: Partial<AppSystemLog>
  ): Promise<AppSystemLog> {
    return this.createLog({
      level: LogSeverity.INFO,
      category,
      component,
      message,
      details,
      ...context,
    });
  }

  /**
   * Log a warning message
   */
  async warning(
    category: string,
    component: string,
    message: string,
    details?: any,
    context?: Partial<AppSystemLog>
  ): Promise<AppSystemLog> {
    return this.createLog({
      level: LogSeverity.WARNING,
      category,
      component,
      message,
      details,
      ...context,
    });
  }

  /**
   * Log an error message
   */
  async error(
    category: string,
    component: string,
    message: string,
    error?: Error,
    context?: Partial<AppSystemLog>
  ): Promise<AppSystemLog> {
    return this.createLog({
      level: LogSeverity.ERROR,
      category,
      component,
      message,
      details: error ? { errorMessage: error.message } : undefined,
      errorCode: error?.name,
      errorStack: error?.stack,
      isAlert: true,
      ...context,
    });
  }

  /**
   * Log a debug message
   */
  async debug(
    category: string,
    component: string,
    message: string,
    details?: any,
    context?: Partial<AppSystemLog>
  ): Promise<AppSystemLog> {
    return this.createLog({
      level: LogSeverity.DEBUG,
      category,
      component,
      message,
      details,
      ...context,
    });
  }

  /**
   * Get system logs with filters (for admin view)
   */
  async getLogs(options: {
    level?: LogSeverity;
    category?: string;
    component?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    isAlert?: boolean;
    isRead?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      level,
      category,
      component,
      userId,
      entityType,
      entityId,
      startDate,
      endDate,
      isAlert,
      isRead,
      search,
      page = 1,
      limit = 50,
    } = options;

    const where: Prisma.AppSystemLogWhereInput = {};

    if (level) where.level = level;
    if (category) where.category = category;
    if (component) where.component = component;
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (isAlert !== undefined) where.isAlert = isAlert;
    if (isRead !== undefined) where.isRead = isRead;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { component: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { errorCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.appSystemLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          readByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.appSystemLog.count({ where }),
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
   * Get log statistics for admin dashboard
   */
  async getLogStats(hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const [byLevel, byCategory, byComponent, alerts, recentErrors] = await Promise.all([
      // Logs by severity level
      prisma.appSystemLog.groupBy({
        by: ['level'],
        where: { timestamp: { gte: startDate } },
        _count: { id: true },
      }),

      // Logs by category
      prisma.appSystemLog.groupBy({
        by: ['category'],
        where: { timestamp: { gte: startDate } },
        _count: { id: true },
      }),

      // Top components
      prisma.appSystemLog.groupBy({
        by: ['component'],
        where: { timestamp: { gte: startDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Unread alerts count
      prisma.appSystemLog.count({
        where: {
          isAlert: true,
          isRead: false,
        },
      }),

      // Recent errors
      prisma.appSystemLog.findMany({
        where: {
          level: { in: [LogSeverity.ERROR, LogSeverity.CRITICAL] },
          timestamp: { gte: startDate },
        },
        take: 5,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          timestamp: true,
          category: true,
          component: true,
          message: true,
        },
      }),
    ]);

    return {
      period: `${hours}h`,
      byLevel,
      byCategory,
      topComponents: byComponent,
      unreadAlerts: alerts,
      recentErrors,
    };
  }

  /**
   * Mark logs as read
   */
  async markAsRead(logIds: string[], readBy: string): Promise<void> {
    await prisma.appSystemLog.updateMany({
      where: { id: { in: logIds } },
      data: {
        isRead: true,
        readBy,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all alerts as read for a user
   */
  async markAllAlertsAsRead(readBy: string): Promise<number> {
    const result = await prisma.appSystemLog.updateMany({
      where: {
        isAlert: true,
        isRead: false,
      },
      data: {
        isRead: true,
        readBy,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get unread alerts for admin
   */
  async getUnreadAlerts(limit: number = 20) {
    return prisma.appSystemLog.findMany({
      where: {
        isAlert: true,
        isRead: false,
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete old logs based on retention policy
   */
  async deleteOldLogs(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.appSystemLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
        isRead: true,
        level: { notIn: [LogSeverity.ERROR, LogSeverity.CRITICAL] },
      },
    });

    return result.count;
  }

  /**
   * Get log categories (for filters)
   */
  async getCategories(): Promise<string[]> {
    const categories = await prisma.appSystemLog.groupBy({
      by: ['category'],
      _count: true,
    });

    return categories.map((c) => c.category);
  }

  /**
   * Get log components (for filters)
   */
  async getComponents(): Promise<string[]> {
    const components = await prisma.appSystemLog.groupBy({
      by: ['component'],
      _count: true,
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    return components.map((c) => c.component);
  }

  /**
   * Create alert rule
   */
  async createAlertRule(data: {
    name: string;
    description?: string;
    logType: string;
    severity?: LogSeverity;
    category?: string;
    component?: string;
    keywords?: string[];
    thresholdCount?: number;
    thresholdWindow?: number;
    sendEmail?: boolean;
    sendSms?: boolean;
    notifyAdmins?: boolean;
    webhookUrl?: string;
  }) {
    return prisma.logAlertRule.create({
      data,
    });
  }

  /**
   * Get alert rules
   */
  async getAlertRules() {
    return prisma.logAlertRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check logs against alert rules and trigger alerts
   */
  async checkAlertRules(): Promise<void> {
    const rules = await prisma.logAlertRule.findMany({
      where: { isActive: true },
    });

    for (const rule of rules) {
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - rule.thresholdWindow);

      const where: Prisma.AppSystemLogWhereInput = {
        timestamp: { gte: windowStart },
      };

      if (rule.severity) where.level = rule.severity;
      if (rule.category) where.category = rule.category;
      if (rule.component) where.component = rule.component;

      if (rule.keywords && rule.keywords.length > 0) {
        where.OR = rule.keywords.map((keyword) => ({
          message: { contains: keyword, mode: 'insensitive' },
        }));
      }

      const count = await prisma.appSystemLog.count({ where });

      if (count >= rule.thresholdCount) {
        // Trigger alert
        logger.warn(`Alert rule triggered: ${rule.name}`, {
          ruleId: rule.id,
          matchedCount: count,
        });

        // Here you would implement the actual alert sending (email, SMS, etc.)
        // This is a placeholder for the actual implementation
      }
    }
  }
}

export default new AppSystemLogService();
