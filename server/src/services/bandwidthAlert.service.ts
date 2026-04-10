import prisma from '../client';
import logger from '../config/logger';
import smsService from './sms.service';

const db = prisma as any;

/**
 * Check all customers with data limits and create alerts when thresholds are exceeded.
 * Called periodically (every 6 hours) from ispScheduler.
 */
const checkAllCustomerQuotas = async (): Promise<void> => {
  logger.info('Bandwidth Alert: Checking customer quotas...');

  try {
    const customers = await prisma.ispCustomer.findMany({
      where: {
        status: 'ACTIVE',
        dataLimit: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        phone: true,
        dataUsed: true,
        dataLimit: true,
        package: { select: { name: true, downloadSpeed: true } },
      },
    });

    let warnings = 0;
    let criticals = 0;

    for (const customer of customers) {
      const used = Number(customer.dataUsed);
      const limit = Number(customer.dataLimit);
      if (limit <= 0) continue;

      const percent = (used / limit) * 100;

      if (percent >= 100) {
        await createAlertIfNew(customer.id, 'QUOTA_EXCEEDED', 'CRITICAL',
          `Quota exceeded for ${customer.fullName || customer.username}`,
          `Data usage: ${formatBytes(used)} / ${formatBytes(limit)} (${percent.toFixed(0)}%)`,
          percent,
        );
        criticals++;

        // Send SMS notification
        if (customer.phone) {
          smsService.sendSms(customer.phone,
            `Your internet data quota has been exceeded (${formatBytes(used)} used of ${formatBytes(limit)}). Please contact your ISP. - AgiliOSP`,
            'QUOTA',
          ).catch(() => {});
        }
      } else if (percent >= 95) {
        await createAlertIfNew(customer.id, 'BANDWIDTH_CRITICAL', 'HIGH',
          `95% quota used — ${customer.fullName || customer.username}`,
          `Data usage: ${formatBytes(used)} / ${formatBytes(limit)} (${percent.toFixed(0)}%)`,
          percent,
        );
      } else if (percent >= 80) {
        await createAlertIfNew(customer.id, 'BANDWIDTH_WARNING', 'MEDIUM',
          `80% quota used — ${customer.fullName || customer.username}`,
          `Data usage: ${formatBytes(used)} / ${formatBytes(limit)} (${percent.toFixed(0)}%)`,
          percent,
        );
        warnings++;
      }
    }

    logger.info(`Bandwidth Alert: Checked ${customers.length} customers — ${warnings} warnings, ${criticals} critical`);
  } catch (err: any) {
    logger.error(`Bandwidth Alert check failed: ${err.message}`);
  }
};

/**
 * Create alert only if no unresolved alert of same type exists for this customer
 */
const createAlertIfNew = async (
  customerId: string, alertType: string, severity: string,
  title: string, description: string, value: number,
): Promise<void> => {
  const existing = await db.deviceAlert.findFirst({
    where: {
      deviceId: customerId,
      alertType,
      status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
    },
  });

  if (existing) return; // Already alerted

  await db.deviceAlert.create({
    data: {
      deviceId: customerId,
      deviceType: 'CUSTOMER',
      alertType,
      severity,
      title,
      description,
      value,
      threshold: alertType === 'QUOTA_EXCEEDED' ? 100 : alertType === 'BANDWIDTH_CRITICAL' ? 95 : 80,
      status: 'ACTIVE',
    },
  });

  // Notify admins via Socket.io
  try {
    const { getSocketController } = await import('../controllers/websocket.controller');
    const socket = getSocketController();
    socket.emitToRoles(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], 'notification', {
      id: `notif_${Date.now()}`,
      type: alertType === 'QUOTA_EXCEEDED' ? 'BANDWIDTH_CRITICAL' : 'BANDWIDTH_WARNING',
      title,
      message: description,
      metadata: { customerId, alertType, severity },
      timestamp: new Date(),
      isRead: false,
    });
  } catch {}
};

/**
 * Auto-resolve bandwidth alerts when usage drops (e.g. after billing cycle reset)
 */
const resolveStaleAlerts = async (): Promise<void> => {
  const activeAlerts = await db.deviceAlert.findMany({
    where: {
      deviceType: 'CUSTOMER',
      alertType: { in: ['BANDWIDTH_WARNING', 'BANDWIDTH_CRITICAL', 'QUOTA_EXCEEDED'] },
      status: 'ACTIVE',
    },
  });

  for (const alert of activeAlerts) {
    const customer = await prisma.ispCustomer.findUnique({
      where: { id: alert.deviceId },
      select: { dataUsed: true, dataLimit: true },
    });

    if (!customer || !customer.dataLimit) continue;

    const percent = (Number(customer.dataUsed) / Number(customer.dataLimit)) * 100;
    const threshold = alert.alertType === 'QUOTA_EXCEEDED' ? 100 : alert.alertType === 'BANDWIDTH_CRITICAL' ? 95 : 80;

    if (percent < threshold - 5) {
      await db.deviceAlert.update({
        where: { id: alert.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }
  }
};

const formatBytes = (b: number): string => {
  if (b >= 1e12) return `${(b / 1e12).toFixed(1)} TB`;
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${b} B`;
};

export default { checkAllCustomerQuotas, resolveStaleAlerts };
