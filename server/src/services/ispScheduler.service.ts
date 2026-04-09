import logger from '../config/logger';
import invoiceService from './invoice.service';
import customerService from './customer.service';
import emailService from './email.service';
import prisma from '../client';

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
        customer: { select: { id: true, gracePeriod: true, username: true, email: true, fullName: true } },
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
        // Send overdue reminder email
        const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (invoice.customer?.email) {
          try {
            await emailService.sendOverdueReminderEmail(
              invoice.customer.email, invoice, invoice.customer.fullName, daysOverdue
            );
          } catch (err) { logger.error(`Failed to send overdue email for ${invoice.invoiceNumber}`, err); }
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
      select: { id: true, autoSuspendDays: true, username: true, email: true, fullName: true },
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
          // Send suspension email
          if (customer.email) {
            try { await emailService.sendServiceSuspendedEmail(customer.email, customer.fullName, 'Payment overdue — auto-suspended'); }
            catch (err) { logger.error(`Failed to send suspension email to ${customer.username}`, err); }
          }
        } else if (daysUntilSuspend <= 3 && daysUntilSuspend > 0 && customer.email) {
          // Send suspension warning (3 days or less before suspend)
          try { await emailService.sendSuspensionWarningEmail(customer.email, customer.fullName, daysUntilSuspend, oldestOverdue); }
          catch (err) { logger.error(`Failed to send suspension warning to ${customer.username}`, err); }
        }
      } catch (err) {
        logger.error(`ISP Scheduler: Failed to auto-suspend customer ${customer.username}`, err);
      }
    }

    logger.info(`ISP Scheduler: Auto-suspend finished — ${suspended} customers suspended`);
  });
};

const startISPSchedulers = (): void => {
  logger.info('ISP Scheduler: Starting automation jobs...');
  scheduleOverdueMarking();
  scheduleMonthlyBilling();
  scheduleAutoSuspend();
};

export default { startISPSchedulers };
