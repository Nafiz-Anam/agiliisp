import httpStatus from 'http-status';
import { IspCustomer, CustomerStatus, Prisma } from '@prisma/client';
import ApiError from '../utils/ApiError';
import prisma from '../client';
import mikrotikService from './mikrotik.service';
import smsService from './sms.service';
import emailService from './email.service';
import logger from '../config/logger';
import customerNoteService from './customerNote.service';

/**
 * Create a new ISP customer
 */
const createCustomer = async (
  customerBody: Omit<Prisma.IspCustomerCreateInput, 'id' | 'createdAt' | 'updatedAt'>
): Promise<IspCustomer> => {
  // Check for duplicate username
  const existingCustomer = await prisma.ispCustomer.findUnique({
    where: { username: customerBody.username as string },
  });

  if (existingCustomer) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already exists');
  }

  // If email provided, check for duplicate
  if (customerBody.email) {
    const existingEmail = await prisma.ispCustomer.findFirst({
      where: { email: customerBody.email as string },
    });

    if (existingEmail) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already exists');
    }
  }

  return prisma.ispCustomer.create({
    data: customerBody,
  });
};

/**
 * Get all customers with pagination
 */
const getCustomers = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus;
  routerId?: string;
  packageId?: string;
  resellerId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const {
    search,
    status,
    routerId,
    packageId,
    resellerId,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;

  const where: Prisma.IspCustomerWhereInput = {};

  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (routerId) {
    where.routerId = routerId;
  }

  if (packageId) {
    where.packageId = packageId;
  }

  if (resellerId) {
    where.resellerId = resellerId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    prisma.ispCustomer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        router: {
          select: {
            id: true,
            name: true,
            host: true,
            status: true,
          },
        },
        package: {
          select: {
            id: true,
            name: true,
            downloadSpeed: true,
            uploadSpeed: true,
            price: true,
          },
        },
        reseller: {
          select: {
            id: true,
            businessName: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            tickets: true,
          },
        },
      },
    }),
    prisma.ispCustomer.count({ where }),
  ]);

  return {
    data: customers,
    meta: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    },
  };
};

/**
 * Get customer by ID
 */
const getCustomerById = async (id: string) => {
  return prisma.ispCustomer.findUnique({
    where: { id },
    include: {
      router: {
        select: {
          id: true,
          name: true,
          host: true,
          status: true,
        },
      },
      package: {
        select: {
          id: true,
          name: true,
          downloadSpeed: true,
          uploadSpeed: true,
          price: true,
        },
      },
      reseller: {
        select: {
          id: true,
          businessName: true,
          supportPhone: true,
          supportEmail: true,
        },
      },
      invoices: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          status: true,
          dueDate: true,
        },
      },
      tickets: {
        take: 5,
        orderBy: { openedAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
        },
      },
    },
  });
};

/**
 * Get customer by username
 */
const getCustomerByUsername = async (username: string): Promise<IspCustomer | null> => {
  return prisma.ispCustomer.findUnique({
    where: { username },
  });
};

/**
 * Update customer by ID
 */
const updateCustomerById = async (
  customerId: string,
  updateBody: Prisma.IspCustomerUpdateInput
): Promise<IspCustomer> => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Check for duplicate username if being updated
  if (updateBody.username && updateBody.username !== customer.username) {
    const existingCustomer = await prisma.ispCustomer.findUnique({
      where: { username: updateBody.username as string },
    });

    if (existingCustomer) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Username already exists');
    }
  }

  // Check for duplicate email if being updated
  if (updateBody.email && updateBody.email !== customer.email) {
    const existingEmail = await prisma.ispCustomer.findFirst({
      where: {
        email: updateBody.email as string,
        id: { not: customerId },
      },
    });

    if (existingEmail) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already exists');
    }
  }

  return prisma.ispCustomer.update({
    where: { id: customerId },
    data: updateBody,
  });
};

/**
 * Delete customer by ID
 */
const deleteCustomerById = async (customerId: string): Promise<IspCustomer> => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Delete from MikroTik if mikrotikId exists
  if (customer.mikrotikId && customer.routerId) {
    try {
      await mikrotikService.deletePPPoESecret(customer.routerId, customer.mikrotikId);
    } catch (error) {
      // Log error but continue with deletion
      console.error('Failed to delete PPPoE secret from router:', error);
    }
  }

  return prisma.ispCustomer.delete({
    where: { id: customerId },
  });
};

/**
 * Suspend customer
 */
const suspendCustomer = async (customerId: string, reason?: string): Promise<IspCustomer> => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Update in database
  const updated = await prisma.ispCustomer.update({
    where: { id: customerId },
    data: {
      status: CustomerStatus.SUSPENDED,
      suspensionReason: reason || 'Manual suspension',
    },
  });

  // Disable in MikroTik if connected
  if (customer.mikrotikId && customer.routerId) {
    try {
      await mikrotikService.updatePPPoESecret(customer.routerId, customer.mikrotikId, {
        disabled: true,
      });
    } catch (error) {
      console.error('Failed to disable PPPoE secret in router:', error);
    }
  }

  customerNoteService.addSystemNote(customerId, `Customer suspended. Reason: ${reason || 'Manual suspension'}`, { action: 'SUSPEND' }).catch(() => {});

  // Notify admins
  try {
    const notifModule = await import('./notification.service');
    notifModule.default.notifyCustomerStatusChanged(customer.fullName, customer.username, 'SUSPENDED').catch(() => {});
  } catch {}

  return updated;
};

/**
 * Activate customer
 */
const activateCustomer = async (customerId: string): Promise<IspCustomer> => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Update in database
  const updated = await prisma.ispCustomer.update({
    where: { id: customerId },
    data: {
      status: CustomerStatus.ACTIVE,
      suspensionReason: null,
    },
  });

  // Enable in MikroTik if connected
  if (customer.mikrotikId && customer.routerId) {
    try {
      await mikrotikService.updatePPPoESecret(customer.routerId, customer.mikrotikId, {
        disabled: false,
      });
    } catch (error) {
      console.error('Failed to enable PPPoE secret in router:', error);
    }
  }

  customerNoteService.addSystemNote(customerId, 'Customer activated', { action: 'ACTIVATE' }).catch(() => {});

  // Notify admins
  try {
    const notifModule = await import('./notification.service');
    notifModule.default.notifyCustomerStatusChanged(customer.fullName, customer.username, 'ACTIVE').catch(() => {});
  } catch {}

  return updated;
};

/**
 * Sync customer to router (create/update PPPoE secret)
 */
const syncCustomerToRouter = async (customerId: string): Promise<IspCustomer> => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (!customer.router || !customer.package) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Customer must have router and package assigned');
  }

  try {
    const secret = await mikrotikService.syncCustomerToRouter(customerId);

    // Update customer with MikroTik ID and sync time
    return prisma.ispCustomer.update({
      where: { id: customerId },
      data: {
        mikrotikId: secret['.id'],
        lastSyncAt: new Date(),
        status:
          customer.status === CustomerStatus.PENDING_ACTIVATION
            ? CustomerStatus.ACTIVE
            : customer.status,
      },
    });
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      `Failed to sync customer to router: ${(error as Error).message}`
    );
  }
};

/**
 * Get customer connection status from router
 */
const getCustomerConnectionStatus = async (customerId: string) => {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (!customer.router) {
    return {
      isOnline: false,
      lastOnlineAt: customer.lastOnlineAt,
      ipAddress: null,
      uptime: null,
    };
  }

  try {
    const activeConnections = await mikrotikService.getActiveConnections(customer.router.id);
    const connection = activeConnections.find((conn) => conn.name === customer.username);

    if (connection) {
      // Update customer online status
      await prisma.ispCustomer.update({
        where: { id: customerId },
        data: {
          isOnline: true,
          lastOnlineAt: new Date(),
        },
      });

      return {
        isOnline: true,
        ipAddress: connection.address,
        uptime: connection.uptime,
        callerId: connection.callerId,
        service: connection.service,
      };
    } else {
      // Update offline status
      await prisma.ispCustomer.update({
        where: { id: customerId },
        data: { isOnline: false },
      });

      return {
        isOnline: false,
        lastOnlineAt: customer.lastOnlineAt,
        ipAddress: null,
        uptime: null,
      };
    }
  } catch (error) {
    return {
      isOnline: customer.isOnline,
      lastOnlineAt: customer.lastOnlineAt,
      ipAddress: null,
      uptime: null,
      error: (error as Error).message,
    };
  }
};

/**
 * Get customer statistics
 */
const getCustomerStats = async (customerId: string) => {
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    include: {
      _count: {
        select: {
          invoices: true,
          tickets: true,
        },
      },
    },
  });

  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // Get invoice statistics
  const invoices = await prisma.invoice.findMany({
    where: { customerId },
    select: {
      status: true,
      totalAmount: true,
      paidAmount: true,
    },
  });

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount.toNumber(), 0);
  const totalUnpaid = totalInvoiced - totalPaid;

  const pendingInvoices = invoices.filter((inv) =>
    ['DRAFT', 'SENT', 'PARTIALLY_PAID'].includes(inv.status)
  ).length;

  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE').length;

  return {
    customer: {
      id: customer.id,
      username: customer.username,
      fullName: customer.fullName,
      status: customer.status,
      isOnline: customer.isOnline,
    },
    invoices: {
      total: customer._count.invoices,
      pending: pendingInvoices,
      overdue: overdueInvoices,
      totalAmount: totalInvoiced,
      paidAmount: totalPaid,
      unpaidAmount: totalUnpaid,
    },
    tickets: {
      total: customer._count.tickets,
    },
    dataUsage: {
      used: customer.dataUsed.toString(),
      limit: customer.dataLimit?.toString() || 'Unlimited',
    },
  };
};

// ── Bulk Operations ──

const bulkSuspend = async (ids: string[], reason: string = 'Bulk suspended') => {
  let success = 0, failed = 0;
  for (const id of ids) {
    try { await suspendCustomer(id, reason); success++; }
    catch { failed++; }
  }
  return { success, failed, total: ids.length };
};

const bulkActivate = async (ids: string[]) => {
  let success = 0, failed = 0;
  for (const id of ids) {
    try { await activateCustomer(id); success++; }
    catch { failed++; }
  }
  return { success, failed, total: ids.length };
};

const bulkChangePackage = async (ids: string[], packageId: string) => {
  let success = 0, failed = 0;
  for (const id of ids) {
    try {
      await prisma.ispCustomer.update({ where: { id }, data: { packageId } });
      success++;
    } catch { failed++; }
  }
  return { success, failed, total: ids.length };
};

// ═══════════════════════════════════════════
// Quick Diagnostics
// ═══════════════════════════════════════════

/**
 * Force-restart customer's PPPoE connection (disconnect → auto-reconnect)
 */
const restartConnection = async (customerId: string) => {
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    include: { router: { select: { id: true, name: true } } },
  });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!customer.router) throw new ApiError(httpStatus.BAD_REQUEST, 'Customer has no router assigned');

  const active = await mikrotikService.getActiveConnections(customer.router.id);
  const conn = active.find(c => c.name === customer.username);
  if (!conn) throw new ApiError(httpStatus.NOT_FOUND, 'Customer is not currently connected');

  await mikrotikService.disconnectActiveUser(customer.router.id, conn['.id']);
  logger.info(`Connection restarted for ${customer.username} by admin`);
  return { success: true, message: `Connection restarted for ${customer.username}. Auto-reconnect in progress.` };
};

/**
 * Reset customer's PPPoE password on the router
 */
const resetPPPoEPassword = async (customerId: string, newPassword?: string, sendSms?: boolean) => {
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    include: { router: { select: { id: true, name: true } } },
  });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!customer.router) throw new ApiError(httpStatus.BAD_REQUEST, 'Customer has no router assigned');

  // Generate random password if not provided
  const password = newPassword || Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 90 + 10);

  // Find the PPPoE secret on the router
  const secrets = await mikrotikService.getPPPoESecrets(customer.router.id);
  const secret = secrets.find(s => s.name === customer.username);
  if (!secret) throw new ApiError(httpStatus.NOT_FOUND, 'PPPoE account not found on router');

  // Update on router
  await mikrotikService.updatePPPoESecret(customer.router.id, secret['.id'], { password });

  // Update in database
  await prisma.ispCustomer.update({ where: { id: customerId }, data: { pppoePassword: password } as any });

  // SMS credentials to customer
  if (sendSms && customer.phone) {
    await smsService.sendSms(
      customer.phone,
      `Your internet login has been updated. Username: ${customer.username}, Password: ${password} — AgiliOSP`,
      'PASSWORD_RESET',
    ).catch(() => {});
  }

  logger.info(`PPPoE password reset for ${customer.username}`);
  return { success: true, password, username: customer.username };
};

/**
 * Check health of customer's assigned router
 */
const checkRouterHealth = async (customerId: string) => {
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    include: { router: { select: { id: true, name: true, host: true, status: true } } },
  });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!customer.router) throw new ApiError(httpStatus.BAD_REQUEST, 'Customer has no router assigned');

  const result = await mikrotikService.testConnection(customer.router.id);
  return { ...result, router: { name: customer.router.name, ip: customer.router.host, status: customer.router.status } };
};

/**
 * Get full active connection details for a customer
 */
const getDetailedConnectionInfo = async (customerId: string) => {
  const customer = await prisma.ispCustomer.findUnique({
    where: { id: customerId },
    include: { router: { select: { id: true, name: true } } },
  });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  if (!customer.router) return { isOnline: false, connection: null };

  const active = await mikrotikService.getActiveConnections(customer.router.id);
  const conn = active.find(c => c.name === customer.username);
  if (!conn) return { isOnline: false, connection: null };

  return {
    isOnline: true,
    connection: {
      connectionId: conn['.id'],
      username: conn.name,
      ipAddress: conn.address,
      macAddress: conn.callerId,
      uptime: conn.uptime,
      service: conn.service,
      sessionId: conn.sessionId,
      encoding: conn.encoding,
      limitBytesIn: conn.limitBytesIn,
      limitBytesOut: conn.limitBytesOut,
    },
  };
};

/**
 * Send a message (SMS/email) to a customer
 */
const sendMessageToCustomer = async (customerId: string, channel: string, message: string, subject?: string) => {
  const customer = await prisma.ispCustomer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');

  let smsSent = false;
  let emailSent = false;

  if ((channel === 'SMS' || channel === 'BOTH') && customer.phone) {
    const result = await smsService.sendSms(customer.phone, message, 'CUSTOM');
    smsSent = result.success;
  }

  if ((channel === 'EMAIL' || channel === 'BOTH') && customer.email) {
    try {
      const emailModule = await import('./email.service');
      await (emailModule.default as any).sendEmail?.({ to: customer.email, subject: subject || 'AgiliOSP Notification', text: message });
      emailSent = true;
    } catch { emailSent = false; }
  }

  return { smsSent, emailSent, customerName: customer.fullName };
};

/**
 * Calculate customer uptime percentage over a given number of days
 */
async function getCustomerUptime(customerId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const stats = await prisma.trafficStat.findMany({
    where: { customerId, periodType: 'DAILY', periodStart: { gte: since } },
    select: { totalOnlineTime: true, periodStart: true },
  });

  const totalOnlineSecs = stats.reduce((sum, s) => sum + (s.totalOnlineTime || 0), 0);
  const wallClockSecs = days * 86400;
  const uptimePercent = wallClockSecs > 0 ? Math.min((totalOnlineSecs / wallClockSecs) * 100, 100) : 0;

  return {
    totalOnlineSeconds: totalOnlineSecs,
    wallClockSeconds: wallClockSecs,
    uptimePercent: Math.round(uptimePercent * 100) / 100,
    days,
    dataPoints: stats.length,
  };
}

// Re-export all including diagnostics
export default {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerByUsername,
  updateCustomerById,
  deleteCustomerById,
  suspendCustomer,
  activateCustomer,
  syncCustomerToRouter,
  getCustomerConnectionStatus,
  getCustomerStats,
  bulkSuspend,
  bulkActivate,
  bulkChangePackage,
  getCustomerUptime,
  restartConnection,
  resetPPPoEPassword,
  checkRouterHealth,
  getDetailedConnectionInfo,
  sendMessageToCustomer,
};
