import prisma from '../client';
import logger from '../config/logger';
import config from '../config/config';

const db = prisma as any;

// SMS Gateway configuration — supports BulkSMSBD, SSLWireless, or any HTTP-based gateway
const SMS_CONFIG = {
  apiUrl: process.env.SMS_API_URL || '',
  apiKey: process.env.SMS_API_KEY || '',
  senderId: process.env.SMS_SENDER_ID || 'AgiloISP',
  enabled: process.env.SMS_ENABLED === 'true',
};

const sendSms = async (phone: string, message: string, type: string = 'GENERAL') => {
  // Log the SMS attempt
  let logId: string | null = null;
  try {
    const log = await db.smsLog.create({
      data: { phone, message, type, status: 'PENDING', provider: 'HTTP_GATEWAY' },
    });
    logId = log.id;
  } catch {
    /* sms_logs table may not exist yet */
  }

  if (!SMS_CONFIG.enabled || !SMS_CONFIG.apiUrl) {
    logger.warn(`SMS not sent (disabled): ${phone} — ${message.slice(0, 50)}...`);
    if (logId)
      try {
        await db.smsLog.update({
          where: { id: logId },
          data: { status: 'SKIPPED', errorMsg: 'SMS disabled' },
        });
      } catch {}
    return { success: false, reason: 'SMS disabled' };
  }

  try {
    // Generic HTTP SMS gateway call — customize URL/params per provider
    const res = await fetch(SMS_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: SMS_CONFIG.apiKey,
        senderid: SMS_CONFIG.senderId,
        number: phone,
        message,
        type: 'text',
      }),
    });

    const data: any = await res.json();
    const success = res.ok && (data.status === 'success' || data.response_code === 202);

    if (logId) {
      try {
        await db.smsLog.update({
          where: { id: logId },
          data: {
            status: success ? 'SENT' : 'FAILED',
            providerRef: data.message_id || data.request_id || null,
            errorMsg: success ? null : JSON.stringify(data),
            sentAt: success ? new Date() : null,
          },
        });
      } catch {}
    }

    if (success) {
      logger.info(`SMS sent to ${phone}: ${message.slice(0, 50)}...`);
    } else {
      logger.error(`SMS failed for ${phone}:`, data);
    }

    return { success, data };
  } catch (err: any) {
    logger.error(`SMS send error for ${phone}: ${err.message}`);
    if (logId)
      try {
        await db.smsLog.update({
          where: { id: logId },
          data: { status: 'FAILED', errorMsg: err.message },
        });
      } catch {}
    return { success: false, reason: err.message };
  }
};

// ── Billing SMS templates ──

const fmt = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT`;

const sendInvoiceSms = async (
  phone: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string
) => {
  const msg = `Invoice ${invoiceNumber}: ${fmt(amount)} due by ${dueDate}. Please pay to avoid service interruption. - AgiloISP`;
  return sendSms(phone, msg, 'INVOICE');
};

const sendPaymentConfirmSms = async (phone: string, amount: number, invoiceNumber: string) => {
  const msg = `Payment of ${fmt(amount)} received for invoice ${invoiceNumber}. Thank you! - AgiloISP`;
  return sendSms(phone, msg, 'PAYMENT');
};

const sendOverdueReminderSms = async (
  phone: string,
  invoiceNumber: string,
  amount: number,
  daysOverdue: number
) => {
  const msg = `REMINDER: Invoice ${invoiceNumber} is ${daysOverdue} days overdue. Balance: ${fmt(amount)}. Pay now to avoid suspension. - AgiloISP`;
  return sendSms(phone, msg, 'OVERDUE');
};

const sendSuspensionWarningSms = async (phone: string, daysLeft: number) => {
  const msg = `WARNING: Your internet service will be suspended in ${daysLeft} day${daysLeft > 1 ? 's' : ''} due to unpaid balance. Please pay immediately. - AgiloISP`;
  return sendSms(phone, msg, 'SUSPENSION_WARNING');
};

const sendServiceSuspendedSms = async (phone: string) => {
  const msg = `Your internet service has been suspended due to non-payment. Please clear your balance to restore service. - AgiloISP`;
  return sendSms(phone, msg, 'SUSPENDED');
};

const sendServiceActivatedSms = async (phone: string) => {
  const msg = `Your internet service has been reactivated! Thank you for your payment. - AgiloISP`;
  return sendSms(phone, msg, 'ACTIVATED');
};

const sendExpiryReminderSms = async (phone: string, daysLeft: number, expiryDate: string) => {
  const msg = `Your internet package expires on ${expiryDate} (${daysLeft} day${daysLeft > 1 ? 's' : ''} left). Renew now to stay connected. - AgiloISP`;
  return sendSms(phone, msg, 'EXPIRY');
};

export default {
  sendSms,
  sendInvoiceSms,
  sendPaymentConfirmSms,
  sendOverdueReminderSms,
  sendSuspensionWarningSms,
  sendServiceSuspendedSms,
  sendServiceActivatedSms,
  sendExpiryReminderSms,
};
