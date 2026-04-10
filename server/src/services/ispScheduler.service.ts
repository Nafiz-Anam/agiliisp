import logger from '../config/logger';
import invoiceService from './invoice.service';
import customerService from './customer.service';
import emailService from './email.service';
import smsService from './sms.service';
import prisma from '../client';
import bandwidthAlertService from './bandwidthAlert.service';

/**
 * Runs a task once per day at the specified hour (24h format).
 */
const scheduleDaily = (hour: number, task: () => Promise<void>): void => {
  let lastRunDate = '';

  setInterval(async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getHours() === hour && lastRunDate !== today) {
      lastRunDate = today;
      try {
        await task();
      } catch (err) {
        logger.error(`Scheduled task at hour ${hour} failed`, err);
      }
    }
  }, 60 * 60 * 1000);
};

/**
 * Mark overdue invoices: finds SENT/PARTIALLY_PAID invoices past due date + grace period.
 * Runs daily at 1 AM.
 */
const scheduleOverdueMarking = (): void => {
  scheduleDaily(1, async () => {
    logger.info('ISP Scheduler: Running overdue marking job...');

    const now = new Date();
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'PARTIALLY_PAID'] },
        dueDate: { lt: now },
      },
      include: {
        customer: { select: { id: true, gracePeriod: true, username: true, email: true, fullName: true, phone: true } },
      },
    });

    let marked = 0;
    for (const invoice of overdueInvoices) {
      const graceDays = invoice.customer?.gracePeriod ?? 3;
      const dueWithGrace = new Date(invoice.dueDate);
      dueWithGrace.setDate(dueWithGrace.getDate() + graceDays);

      if (now > dueWithGrace) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
        marked++;
        // Send overdue reminder (email + SMS)
        const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (invoice.customer?.email) {
          try { await emailService.sendOverdueReminderEmail(invoice.customer.email, invoice, invoice.customer.fullName, daysOverdue); }
          catch (err) { logger.error(`Failed to send overdue email for ${invoice.invoiceNumber}`, err); }
        }
        if ((invoice.customer as any)?.phone) {
          try { await smsService.sendOverdueReminderSms((invoice.customer as any).phone, invoice.invoiceNumber, Number(invoice.balanceDue), daysOverdue); }
          catch {}
        }
      }
    }

    logger.info(`ISP Scheduler: Overdue marking finished — ${marked} invoices marked OVERDUE`);
  });
};

/**
 * Monthly auto-billing: generate invoices for customers whose nextBillingDate has passed.
 * Runs daily at 2 AM.
 */
const scheduleMonthlyBilling = (): void => {
  scheduleDaily(2, async () => {
    logger.info('ISP Scheduler: Running auto-billing job...');

    const now = new Date();
    const customers = await prisma.ispCustomer.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { nextBillingDate: { lte: now } },
          { nextBillingDate: null },
        ],
      },
      include: { package: true, reseller: true },
    });

    let created = 0;
    for (const customer of customers) {
      try {
        const price = customer.customPrice
          ? Number(customer.customPrice)
          : Number(customer.package.price);

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15); // 15-day payment term

        await invoiceService.createInvoice(
          {
            customerId: customer.id,
            dueDate,
            items: [
              {
                description: `Internet service - ${customer.package.name}`,
                packageId: customer.packageId,
                quantity: 1,
                unitPrice: price,
              },
            ],
          },
          'SYSTEM'
        );

        // Update nextBillingDate
        const nextDate = new Date(customer.nextBillingDate || now);
        nextDate.setMonth(nextDate.getMonth() + (customer.billingCycle || 1));
        await prisma.ispCustomer.update({
          where: { id: customer.id },
          data: { nextBillingDate: nextDate },
        });

        created++;
      } catch (err) {
        logger.error(`ISP Scheduler: Failed to generate invoice for ${customer.username}`, err);
      }
    }

    logger.info(`ISP Scheduler: Auto-billing created ${created} invoices`);
  });
};

/**
 * Auto-suspend overdue customers past their autoSuspendDays threshold.
 * Runs daily at 3 AM.
 */
const scheduleAutoSuspend = (): void => {
  scheduleDaily(3, async () => {
    logger.info('ISP Scheduler: Running auto-suspend job...');

    const overdueCustomers = await prisma.ispCustomer.findMany({
      where: {
        autoSuspend: true,
        status: 'ACTIVE',
        invoices: {
          some: {
            status: 'OVERDUE',
            dueDate: { lt: new Date() },
          },
        },
      },
      select: { id: true, autoSuspendDays: true, username: true, email: true, fullName: true, phone: true },
    });

    let suspended = 0;
    for (const customer of overdueCustomers) {
      try {
        const oldestOverdue = await prisma.invoice.findFirst({
          where: {
            customerId: customer.id,
            status: 'OVERDUE',
            dueDate: { lt: new Date() },
          },
          orderBy: { dueDate: 'asc' },
        });

        if (!oldestOverdue) continue;

        const daysPastDue = Math.floor(
          (Date.now() - oldestOverdue.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const daysUntilSuspend = customer.autoSuspendDays - daysPastDue;

        if (daysPastDue >= customer.autoSuspendDays) {
          await customerService.suspendCustomer(customer.id, 'Auto-suspended: payment overdue');
          suspended++;
          logger.info(`ISP Scheduler: Auto-suspended customer ${customer.username}`);
          // Send suspension notifications (email + SMS)
          if (customer.email) {
            try { await emailService.sendServiceSuspendedEmail(customer.email, customer.fullName, 'Payment overdue — auto-suspended'); }
            catch (err) { logger.error(`Failed to send suspension email to ${customer.username}`, err); }
          }
          if ((customer as any).phone) {
            try { await smsService.sendServiceSuspendedSms((customer as any).phone); } catch {}
          }
        } else if (daysUntilSuspend <= 3 && daysUntilSuspend > 0) {
          // Send suspension warning (3 days or less before suspend)
          if (customer.email) {
            try { await emailService.sendSuspensionWarningEmail(customer.email, customer.fullName, daysUntilSuspend, oldestOverdue); }
            catch (err) { logger.error(`Failed to send suspension warning to ${customer.username}`, err); }
          }
          if ((customer as any).phone) {
            try { await smsService.sendSuspensionWarningSms((customer as any).phone, daysUntilSuspend); } catch {}
          }
        }
      } catch (err) {
        logger.error(`ISP Scheduler: Failed to auto-suspend customer ${customer.username}`, err);
      }
    }

    logger.info(`ISP Scheduler: Auto-suspend finished — ${suspended} customers suspended`);
  });
};

/**
 * Prepaid expiry: disconnect customers whose prepaid package has expired.
 * Also sends reminder 3 days and 1 day before expiry.
 * Runs daily at 4 AM.
 */
const schedulePrepaidExpiry = (): void => {
  scheduleDaily(4, async () => {
    logger.info('ISP Scheduler: Running prepaid expiry job...');
    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // 1. Suspend expired prepaid customers
    const db = prisma as any;
    let expired: any[] = [];
    try {
      expired = await db.ispCustomer.findMany({
        where: {
          billingType: 'PREPAID',
          status: 'ACTIVE',
          expiryDate: { lt: now },
        },
        select: { id: true, username: true, email: true, fullName: true, phone: true, expiryDate: true },
      });
    } catch { /* billingType field may not exist yet */ }

    let disconnected = 0;
    for (const customer of expired) {
      try {
        await customerService.suspendCustomer(customer.id, 'Prepaid package expired');
        disconnected++;
        if (customer.email) {
          try { await emailService.sendServiceSuspendedEmail(customer.email, customer.fullName, 'Prepaid package expired'); } catch {}
        }
        if (customer.phone) {
          try { await smsService.sendServiceSuspendedSms(customer.phone); } catch {}
        }
      } catch (err) {
        logger.error(`Failed to disconnect expired prepaid customer ${customer.username}`, err);
      }
    }

    // 2. Send expiry reminders (3 days and 1 day before)
    let reminded = 0;
    try {
      const expiringSoon = await db.ispCustomer.findMany({
        where: {
          billingType: 'PREPAID',
          status: 'ACTIVE',
          expiryDate: { gte: now, lte: threeDaysFromNow },
        },
        select: { id: true, username: true, email: true, fullName: true, phone: true, expiryDate: true },
      });

      for (const customer of expiringSoon) {
        const daysLeft = Math.ceil(((customer.expiryDate as Date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft === 3 || daysLeft === 1) {
          const expiryStr = (customer.expiryDate as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          if (customer.phone) {
            try { await smsService.sendExpiryReminderSms(customer.phone, daysLeft, expiryStr); reminded++; } catch {}
          }
        }
      }
    } catch { /* billingType may not exist */ }

    logger.info(`ISP Scheduler: Prepaid expiry — ${disconnected} disconnected, ${reminded} reminded`);
  });
};

/**
 * Compliance log cleanup: delete records older than 180 days (6-month BTRC retention).
 * Runs daily at 5 AM.
 */
const scheduleComplianceCleanup = (): void => {
  scheduleDaily(5, async () => {
    logger.info('ISP Scheduler: Running compliance log cleanup...');
    const db = prisma as any;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);

    const [sessions, nat, auth] = await Promise.all([
      db.sessionLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      db.natLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      db.authenticationLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
    ]);

    logger.info(`ISP Scheduler: Compliance cleanup — deleted ${sessions.count} session, ${nat.count} NAT, ${auth.count} auth logs older than 180 days`);
  });
};

const startISPSchedulers = (): void => {
  logger.info('ISP Scheduler: Starting automation jobs...');
  scheduleOverdueMarking();
  scheduleMonthlyBilling();
  scheduleAutoSuspend();
  schedulePrepaidExpiry();
  scheduleComplianceCleanup();

  // Ticket escalation check every 30 minutes
  setInterval(async () => {
    try {
      const db = prisma as any;
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const criticalTickets = await db.supportTicket.findMany({
        where: { priority: 'CRITICAL', status: { in: ['OPEN', 'IN_PROGRESS'] }, openedAt: { lt: twoHoursAgo } },
        include: { customer: { select: { fullName: true } } },
      });
      if (criticalTickets.length > 0) {
        const managers = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'MANAGER'] as any }, isActive: true } });
        for (const manager of managers) {
          try {
            const notifModule = await import('./notification.service');
            notifModule.default.createNotification(manager.id, 'SECURITY_ALERT' as any, `${criticalTickets.length} Critical Ticket(s) Unresolved`, `Critical tickets open > 2 hours need attention`);
          } catch {}
        }
        logger.info(`Ticket escalation: ${criticalTickets.length} critical tickets escalated to ${managers.length} managers`);
      }
    } catch (err) { logger.error('Ticket escalation check failed', err); }
  }, 30 * 60 * 1000);

  // Bandwidth quota check every 6 hours
  setInterval(async () => {
    try {
      await bandwidthAlertService.checkAllCustomerQuotas();
      await bandwidthAlertService.resolveStaleAlerts();
    } catch (err) { logger.error('Bandwidth alert check failed', err); }
  }, 6 * 60 * 60 * 1000);
  // Run initial check after 2 minutes
  setTimeout(() => {
    bandwidthAlertService.checkAllCustomerQuotas().catch(() => {});
  }, 120000);
};

export default { startISPSchedulers };
