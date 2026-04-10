import prisma from '../client';
import logger from '../config/logger';
import { Prisma } from '@prisma/client';
import invoiceService from './invoice.service';
import smsService from './sms.service';

const db = prisma as any;

// bKash/Nagad configuration
const BKASH_CONFIG = {
  appKey: process.env.BKASH_APP_KEY || '',
  appSecret: process.env.BKASH_APP_SECRET || '',
  username: process.env.BKASH_USERNAME || '',
  password: process.env.BKASH_PASSWORD || '',
  baseUrl: process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta',
  enabled: process.env.BKASH_ENABLED === 'true',
};

const NAGAD_CONFIG = {
  merchantId: process.env.NAGAD_MERCHANT_ID || '',
  merchantKey: process.env.NAGAD_MERCHANT_KEY || '',
  baseUrl: process.env.NAGAD_BASE_URL || 'https://api.mynagad.com/api',
  enabled: process.env.NAGAD_ENABLED === 'true',
};

// ── Record incoming mobile payment and auto-match to customer/invoice ──

const processIncomingPayment = async (body: {
  provider: string;
  transactionId: string;
  senderNumber: string;
  receiverNumber: string;
  amount: number;
  rawPayload?: any;
}) => {
  // Record the mobile payment
  const payment = await db.mobilePayment.create({
    data: {
      provider: body.provider,
      transactionId: body.transactionId,
      senderNumber: body.senderNumber,
      receiverNumber: body.receiverNumber,
      amount: new Prisma.Decimal(body.amount),
      rawPayload: body.rawPayload || null,
      status: 'PENDING',
    },
  });

  // Normalize phone to digits only, then generate all common BD variations
  const digits = body.senderNumber.replace(/[\s\-().]+/g, '');
  // Extract the local 10-digit part (e.g. 1XXXXXXXXX)
  const local = digits.replace(/^(?:\+?00?)?880/, '');
  const phoneVariations = [
    body.senderNumber,         // exact as received
    digits,                    // cleaned digits
    `0${local}`,              // 01XXXXXXXXX
    `+880${local}`,           // +8801XXXXXXXXX
    `880${local}`,            // 8801XXXXXXXXX
    `00880${local}`,          // 008801XXXXXXXXX
  ].filter((v, i, a) => a.indexOf(v) === i); // dedupe

  // Try to auto-match to a customer by phone number
  const customer = await prisma.ispCustomer.findFirst({
    where: {
      OR: phoneVariations.map(p => ({ phone: p })),
    },
    select: { id: true, fullName: true, phone: true, username: true },
  });

  if (!customer) {
    logger.warn(`Mobile payment ${body.transactionId}: No customer found for ${body.senderNumber}`);
    return { payment, matched: false, message: 'Customer not found for sender number' };
  }

  // Find oldest unpaid invoice for this customer
  const invoice = await prisma.invoice.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      balanceDue: { gt: 0 },
    },
    orderBy: { dueDate: 'asc' },
  });

  if (!invoice) {
    await db.mobilePayment.update({
      where: { id: payment.id },
      data: { customerId: customer.id, status: 'NO_INVOICE', matchedAt: new Date() },
    });
    logger.info(`Mobile payment ${body.transactionId}: Matched customer ${customer.username} but no outstanding invoice`);
    return { payment, matched: true, customerId: customer.id, message: 'Customer matched but no outstanding invoice' };
  }

  // Apply payment to invoice
  try {
    await invoiceService.addPayment(invoice.id, {
      amount: body.amount,
      paymentMethod: body.provider === 'BKASH' ? 'MOBILE_MONEY' as any : 'MOBILE_MONEY' as any,
      referenceNumber: `${body.provider}:${body.transactionId}`,
      notes: `Auto-credited from ${body.provider} payment by ${body.senderNumber}`,
    });

    await db.mobilePayment.update({
      where: { id: payment.id },
      data: {
        customerId: customer.id,
        invoiceId: invoice.id,
        status: 'PROCESSED',
        matchedAt: new Date(),
        processedAt: new Date(),
      },
    });

    // Send SMS confirmation
    if (customer.phone) {
      try {
        await smsService.sendPaymentConfirmSms(customer.phone, body.amount, invoice.invoiceNumber);
      } catch (smsErr: any) {
        logger.error(`Mobile payment ${body.transactionId}: SMS confirmation failed for ${customer.phone} — ${smsErr.message}`);
      }
    }

    logger.info(`Mobile payment ${body.transactionId}: Auto-credited ${body.amount} to invoice ${invoice.invoiceNumber} for customer ${customer.username}`);
    return { payment, matched: true, customerId: customer.id, invoiceId: invoice.id, message: 'Payment auto-credited' };
  } catch (err: any) {
    await db.mobilePayment.update({
      where: { id: payment.id },
      data: { customerId: customer.id, status: 'FAILED', matchedAt: new Date() },
    });
    logger.error(`Mobile payment ${body.transactionId}: Failed to credit — ${err.message}`);
    return { payment, matched: true, error: err.message };
  }
};

// ── Manual match (for unmatched payments) ──

const manualMatchPayment = async (paymentId: string, customerId: string, invoiceId: string) => {
  const mobilePayment = await db.mobilePayment.findUnique({ where: { id: paymentId } });
  if (!mobilePayment) throw new Error('Mobile payment not found');

  // Apply to invoice
  await invoiceService.addPayment(invoiceId, {
    amount: Number(mobilePayment.amount),
    paymentMethod: 'MOBILE_MONEY' as any,
    referenceNumber: `${mobilePayment.provider}:${mobilePayment.transactionId}`,
    notes: `Manually matched ${mobilePayment.provider} payment`,
  });

  await db.mobilePayment.update({
    where: { id: paymentId },
    data: { customerId, invoiceId, status: 'PROCESSED', matchedAt: new Date(), processedAt: new Date() },
  });

  return { success: true };
};

// ── Query ──

const getMobilePayments = async (options: {
  status?: string; provider?: string; page?: number; limit?: number;
}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 20;
  const where: any = {};
  if (options.status) where.status = options.status;
  if (options.provider) where.provider = options.provider;

  const [payments, total] = await Promise.all([
    db.mobilePayment.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    db.mobilePayment.count({ where }),
  ]);

  return { data: payments, meta: { page, limit, totalPages: Math.ceil(total / limit), total } };
};

export default { processIncomingPayment, manualMatchPayment, getMobilePayments };
