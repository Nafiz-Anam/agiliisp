import logger from '../config/logger';
import invoiceService from './invoice.service';
import customerService from './customer.service';
import prisma from '../client';

/**
 * Runs a task once per day at the specified hour (24h format).
 * Uses setInterval checking every hour (no new dependencies).
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
  }, 60 * 60 * 1000); // check every hour
};

/**
 * Monthly auto-billing: generate invoices for all ACTIVE customers.
 * Runs daily at 2 AM. Creates invoice with 7-day payment term.
 */
const scheduleMonthlyBilling = (): void => {
  scheduleDaily(2, async () => {
    logger.info('ISP Scheduler: Running auto-billing job...');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const result = await invoiceService.autoGenerateInvoices(dueDate, 'SYSTEM');
    logger.info(`ISP Scheduler: Auto-billing created ${result.created} invoices`);
  });
};

/**
 * Auto-suspend overdue customers: suspends customers with unpaid invoices
 * past their autoSuspendDays threshold.
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
            status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
            dueDate: { lt: new Date() },
          },
        },
      },
      select: { id: true, autoSuspendDays: true, username: true },
    });

    let suspended = 0;
    for (const customer of overdueCustomers) {
      try {
        const oldestOverdue = await prisma.invoice.findFirst({
          where: {
            customerId: customer.id,
            status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
            dueDate: { lt: new Date() },
          },
          orderBy: { dueDate: 'asc' },
        });

        if (!oldestOverdue) continue;

        const daysPastDue = Math.floor(
          (Date.now() - oldestOverdue.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysPastDue >= customer.autoSuspendDays) {
          await customerService.suspendCustomer(customer.id, 'Auto-suspended: payment overdue');
          suspended++;
          logger.info(`ISP Scheduler: Auto-suspended customer ${customer.username}`);
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
  scheduleMonthlyBilling();
  scheduleAutoSuspend();
};

export default { startISPSchedulers };
