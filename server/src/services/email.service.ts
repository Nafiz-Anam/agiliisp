import nodemailer from 'nodemailer';
import config from '../config/config';
import logger from '../config/logger';

// Create transporter with error handling
let transporter: nodemailer.Transporter;
let emailServiceStatus = 'unknown';

const initializeEmailService = () => {
  try {
    transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      },
    });

    // Verify connection on initialization
    transporter.verify((error, success) => {
      if (error) {
        emailServiceStatus = 'error';
        logger.error('Email service initialization failed', {
          error: error.message,
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          user: config.email.smtp.auth.user,
        });
      } else {
        emailServiceStatus = 'connected';
        logger.info('Email service initialized successfully', {
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          user: config.email.smtp.auth.user,
        });
      }
    });
  } catch (error) {
    emailServiceStatus = 'error';
    logger.error('Failed to create email transporter', { error });
  }
};

// Initialize email service on module load
initializeEmailService();

/**
 * Check email service health
 * @returns {Promise<Object>} Email service status
 */
const checkEmailServiceHealth = async () => {
  if (!transporter) {
    return {
      status: 'error',
      message: 'Email transporter not initialized',
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      user: config.email.smtp.auth.user,
    };
  }

  try {
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          reject(error);
        } else {
          resolve(success);
        }
      });
    });

    return {
      status: 'connected',
      message: 'Email service is healthy',
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      user: config.email.smtp.auth.user,
    };
  } catch (error) {
    emailServiceStatus = 'error';
    return {
      status: 'error',
      message: error.message,
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      user: config.email.smtp.auth.user,
    };
  }
};

/**
 * Send email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 * @returns {Promise}
 */
const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  if (!transporter) {
    const error = new Error('Email transporter not available');
    logger.error('Email service not available', { to, subject });
    throw error;
  }

  try {
    const msg = { from: config.email.from, to, subject, text, html };
    const result = await transporter.sendMail(msg);
    logger.info(`Email sent successfully to ${to}`, {
      messageId: result.messageId,
      subject,
      response: result.response,
    });
    return result;
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject,
      error: error.message,
      emailServiceStatus,
    });
    throw error;
  }
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @param {string} name
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to: string, token: string, name: string) => {
  const resetPasswordUrl = `${config.clientUrl || 'http://localhost:8000'}/reset-password?token=${token}`;
  const subject = 'Reset password';
  const text = `Dear ${name},
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  const html = `<div>Dear ${name},<br><br>To reset your password, click on this link: <a href="${resetPasswordUrl}">Reset Password</a><br><br>If you did not request any password resets, then ignore this email.</div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @param {string} name
 * @returns {Promise}
 */
const sendVerificationEmail = async (to: string, token: string, name: string) => {
  const verificationEmailUrl = `${config.clientUrl || 'http://localhost:8000'}/verify-email?token=${token}`;
  const subject = 'Email Verification';
  const text = `Dear ${name},
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  const html = `<div>Dear ${name},<br><br>To verify your email, click on this link: <a href="${verificationEmailUrl}">Verify Email</a><br><br>If you did not create an account, then ignore this email.</div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send welcome email
 * @param {string} to
 * @param {string} name
 * @returns {Promise}
 */
const sendWelcomeEmail = async (to: string, name: string) => {
  const subject = 'Welcome to our platform';
  const text = `Dear ${name},
Welcome to our platform! We're excited to have you on board.`;
  const html = `<div>Dear ${name},<br><br>Welcome to our platform! We're excited to have you on board.</div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send login alert email
 * @param {string} to
 * @param {Object} loginData
 * @returns {Promise}
 */
const sendLoginAlertEmail = async (
  to: string,
  loginData: {
    deviceName: string;
    location?: string;
    ipAddress?: string;
    browser?: string;
    os?: string;
  }
) => {
  const subject = 'New Login Detected';
  const text = `A new login was detected on your account.
Device: ${loginData.deviceName}
${loginData.location ? `Location: ${loginData.location}` : ''}
${loginData.ipAddress ? `IP Address: ${loginData.ipAddress}` : ''}
${loginData.browser ? `Browser: ${loginData.browser}` : ''}
${loginData.os ? `OS: ${loginData.os}` : ''}

If this wasn't you, please secure your account immediately.`;

  const html = `<div>
    <h3>New Login Detected</h3>
    <p>A new login was detected on your account.</p>
    <p><strong>Device:</strong> ${loginData.deviceName}</p>
    ${loginData.location ? `<p><strong>Location:</strong> ${loginData.location}</p>` : ''}
    ${loginData.ipAddress ? `<p><strong>IP Address:</strong> ${loginData.ipAddress}</p>` : ''}
    ${loginData.browser ? `<p><strong>Browser:</strong> ${loginData.browser}</p>` : ''}
    ${loginData.os ? `<p><strong>OS:</strong> ${loginData.os}</p>` : ''}
    <p>If this wasn't you, please secure your account immediately.</p>
  </div>`;

  await sendEmail(to, subject, text, html);
};

/**
 * Send account lockout email
 * @param {string} to
 * @param {string} name
 * @param {Object} lockoutData
 * @returns {Promise}
 */
const sendAccountLockoutEmail = async (
  to: string,
  name: string,
  lockoutData: {
    reason: string;
    lockoutUntil?: Date;
    failedAttempts: number;
  }
) => {
  const subject = 'Account Locked';
  const text = `Dear ${name},
Your account has been locked due to ${lockoutData.reason}.
Failed login attempts: ${lockoutData.failedAttempts}
${lockoutData.lockoutUntil ? `Lockout until: ${lockoutData.lockoutUntil}` : ''}

Please contact support if you need assistance.`;

  const html = `<div>
    <h3>Account Locked</h3>
    <p>Dear ${name},</p>
    <p>Your account has been locked due to ${lockoutData.reason}.</p>
    <p><strong>Failed login attempts:</strong> ${lockoutData.failedAttempts}</p>
    ${lockoutData.lockoutUntil ? `<p><strong>Lockout until:</strong> ${lockoutData.lockoutUntil}</p>` : ''}
    <p>Please contact support if you need assistance.</p>
  </div>`;

  await sendEmail(to, subject, text, html);
};

/**
 * Send security update email
 * @param {string} to
 * @param {Object} data
 * @returns {Promise}
 */
const sendSecurityUpdateEmail = async (to: string, data: { title: string; message: string }) => {
  const subject = data.title;
  const text = data.message;
  const html = `<div>${data.message}</div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send password expiry email
 * @param {string} to
 * @param {Object} data
 * @returns {Promise}
 */
const sendPasswordExpiryEmail = async (to: string, data: { daysUntilExpiry: number }) => {
  const subject = 'Password Expiry Alert';
  const text = `Your password will expire in ${data.daysUntilExpiry} days. Please change it soon to maintain account security.`;
  const html = `<div><h3>Password Expiry Alert</h3><p>Your password will expire in ${data.daysUntilExpiry} days. Please change it soon to maintain account security.</p></div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send suspicious activity email
 * @param {string} to
 * @param {Object} data
 * @returns {Promise}
 */
const sendSuspiciousActivityEmail = async (
  to: string,
  data: { activity: string; location: string }
) => {
  const subject = 'Suspicious Activity Detected';
  const text = `Suspicious activity detected: ${data.activity} from ${data.location}. If this wasn't you, please secure your account immediately.`;
  const html = `<div><h3>Suspicious Activity Detected</h3><p>Suspicious activity detected: ${data.activity} from ${data.location}. If this wasn't you, please secure your account immediately.</p></div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send password change email
 * @param {string} to
 * @param {string} name
 * @param {Object} data
 * @returns {Promise}
 */
const sendPasswordChangeEmail = async (
  to: string,
  name: string,
  data: {
    ipAddress: string;
    deviceName: string;
    timestamp: Date;
  }
) => {
  const subject = 'Password Changed';
  const text = `Dear ${name},
Your password has been successfully changed.
Device: ${data.deviceName}
IP Address: ${data.ipAddress}
Time: ${data.timestamp}

If this wasn't you, please secure your account immediately.`;

  const html = `<div>
    <h3>Password Changed</h3>
    <p>Dear ${name},</p>
    <p>Your password has been successfully changed.</p>
    <p><strong>Device:</strong> ${data.deviceName}</p>
    <p><strong>IP Address:</strong> ${data.ipAddress}</p>
    <p><strong>Time:</strong> ${data.timestamp}</p>
    <p>If this wasn't you, please secure your account immediately.</p>
  </div>`;

  await sendEmail(to, subject, text, html);
};

/**
 * Send 2FA email
 * @param {string} to
 * @param {string} name
 * @param {Object} data
 * @returns {Promise}
 */
const sendTwoFactorEmail = async (to: string, name: string, data: { enabled: boolean }) => {
  const action = data.enabled ? 'enabled' : 'disabled';
  const subject = `Two-Factor Authentication ${data.enabled ? 'Enabled' : 'Disabled'}`;
  const text = `Dear ${name},
Two-factor authentication has been ${action} for your account.`;

  const html = `<div>
    <h3>Two-Factor Authentication ${data.enabled ? 'Enabled' : 'Disabled'}</h3>
    <p>Dear ${name},</p>
    <p>Two-factor authentication has been ${action} for your account.</p>
  </div>`;

  await sendEmail(to, subject, text, html);
};

/**
 * Send device login email
 * @param {string} to
 * @param {string} name
 * @param {Object} data
 * @returns {Promise}
 */
const sendDeviceLoginEmail = async (
  to: string,
  name: string,
  data: {
    deviceName: string;
    ipAddress: string;
    location?: string;
    browser?: string;
    os?: string;
  }
) => {
  const subject = 'New Device Login';
  const text = `Dear ${name},
A new device has logged into your account.
Device: ${data.deviceName}
IP Address: ${data.ipAddress}
${data.location ? `Location: ${data.location}` : ''}
${data.browser ? `Browser: ${data.browser}` : ''}
${data.os ? `OS: ${data.os}` : ''}

If this wasn't you, please secure your account immediately.`;

  const html = `<div>
    <h3>New Device Login</h3>
    <p>Dear ${name},</p>
    <p>A new device has logged into your account.</p>
    <p><strong>Device:</strong> ${data.deviceName}</p>
    <p><strong>IP Address:</strong> ${data.ipAddress}</p>
    ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
    ${data.browser ? `<p><strong>Browser:</strong> ${data.browser}</p>` : ''}
    ${data.os ? `<p><strong>OS:</strong> ${data.os}</p>` : ''}
    <p>If this wasn't you, please secure your account immediately.</p>
  </div>`;

  await sendEmail(to, subject, text, html);
};

/**
 * Send email verification OTP
 * @param {string} to
 * @param {string} otp
 * @param {string} name
 * @returns {Promise}
 */
export const sendEmailVerificationOtp = async (to: string, otp: string, name: string) => {
  const subject = 'Your Email Verification Code';
  const text = `Dear ${name},\nYour email verification code is: ${otp}\nThis code will expire in 5 minutes. If you did not create an account, please ignore this email.`;
  const html = `<div>Dear ${name},<br><br>Your email verification code is: <b>${otp}</b><br><br>This code will expire in 5 minutes.<br>If you did not create an account, please ignore this email.</div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Send password reset OTP
 * @param {string} to
 * @param {string} otp
 * @param {string} name
 * @returns {Promise}
 */
export const sendPasswordResetOtp = async (to: string, otp: string, name: string) => {
  const subject = 'Your Password Reset Code';
  const text = `Dear ${name},\nYour password reset code is: ${otp}\nThis code will expire in 5 minutes. If you did not request a password reset, please ignore this email.`;
  const html = `<div>Dear ${name},<br><br>Your password reset code is: <b>${otp}</b><br><br>This code will expire in 5 minutes.<br>If you did not request a password reset, please ignore this email.</div>`;
  await sendEmail(to, subject, text, html);
};

/**
 * Verify SMTP connection at startup
 */
// ═══════════════════════════════════════════════════════
// Billing & Invoice Emails
// ═══════════════════════════════════════════════════════

const fmt = (n: number) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: any) =>
  d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

const billingWrapper = (title: string, body: string) => `
<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1e293b;">
  <div style="background:#3b82f6;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">${title}</h2>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">This is an automated email. Please do not reply directly.</p>
  </div>
</div>`;

const sendInvoiceEmail = async (to: string, invoice: any, companyName: string = 'AgiloISP') => {
  const items = (invoice.items || [])
    .map(
      (item: any) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;">${item.description}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">${item.quantity}</td>
     <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(item.totalPrice)}</td></tr>`
    )
    .join('');

  const html = billingWrapper(
    `Invoice ${invoice.invoiceNumber}`,
    `
    <p>Dear <strong>${invoice.customer?.fullName || 'Customer'}</strong>,</p>
    <p>A new invoice has been generated for your account.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f8fafc;"><td style="padding:8px;font-size:13px;color:#64748b;">Invoice #</td><td style="padding:8px;font-weight:bold;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="padding:8px;font-size:13px;color:#64748b;">Invoice Date</td><td style="padding:8px;">${fmtDate(invoice.invoiceDate)}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px;font-size:13px;color:#64748b;">Due Date</td><td style="padding:8px;font-weight:bold;color:#ef4444;">${fmtDate(invoice.dueDate)}</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
      <tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:center;">Qty</th><th style="padding:8px;text-align:right;">Amount</th></tr>
      ${items}
    </table>
    <div style="text-align:right;margin-top:12px;">
      <p style="font-size:20px;font-weight:bold;color:#1e293b;margin:0;">Total: ${fmt(invoice.totalAmount)}</p>
      ${Number(invoice.paidAmount) > 0 ? `<p style="font-size:13px;color:#10b981;margin:4px 0;">Paid: ${fmt(invoice.paidAmount)}</p>` : ''}
      ${Number(invoice.balanceDue) > 0 ? `<p style="font-size:16px;font-weight:bold;color:#ef4444;margin:4px 0;">Balance Due: ${fmt(invoice.balanceDue)}</p>` : ''}
    </div>
    <p style="margin-top:16px;font-size:13px;color:#64748b;">Please ensure payment is made by <strong>${fmtDate(invoice.dueDate)}</strong> to avoid service interruption.</p>
  `
  );

  const text = `Invoice ${invoice.invoiceNumber} - Total: ${fmt(invoice.totalAmount)} - Due: ${fmtDate(invoice.dueDate)}`;
  return sendEmail(
    to,
    `Invoice ${invoice.invoiceNumber} — ${fmt(invoice.totalAmount)} Due`,
    text,
    html
  );
};

const sendPaymentConfirmationEmail = async (
  to: string,
  payment: any,
  invoice: any,
  customerName: string
) => {
  const html = billingWrapper(
    'Payment Received',
    `
    <p>Dear <strong>${customerName}</strong>,</p>
    <p>We have received your payment. Thank you!</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f0fdf4;"><td style="padding:8px;font-size:13px;color:#64748b;">Amount Paid</td><td style="padding:8px;font-weight:bold;color:#10b981;font-size:18px;">${fmt(payment.amount)}</td></tr>
      <tr><td style="padding:8px;font-size:13px;color:#64748b;">Payment Method</td><td style="padding:8px;">${(payment.paymentMethod || '').replace(/_/g, ' ')}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px;font-size:13px;color:#64748b;">Invoice #</td><td style="padding:8px;">${invoice?.invoiceNumber || '—'}</td></tr>
      <tr><td style="padding:8px;font-size:13px;color:#64748b;">Reference</td><td style="padding:8px;">${payment.referenceNumber || '—'}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:8px;font-size:13px;color:#64748b;">Date</td><td style="padding:8px;">${fmtDate(payment.paymentDate)}</td></tr>
      <tr><td style="padding:8px;font-size:13px;color:#64748b;">Remaining Balance</td><td style="padding:8px;font-weight:bold;">${fmt(invoice?.balanceDue || 0)}</td></tr>
    </table>
    ${Number(invoice?.balanceDue) <= 0 ? '<p style="color:#10b981;font-weight:bold;">✓ This invoice is now fully paid.</p>' : ''}
  `
  );

  const text = `Payment of ${fmt(payment.amount)} received for Invoice ${invoice?.invoiceNumber || ''}`;
  return sendEmail(to, `Payment Confirmed — ${fmt(payment.amount)}`, text, html);
};

const sendOverdueReminderEmail = async (
  to: string,
  invoice: any,
  customerName: string,
  daysOverdue: number
) => {
  const html = billingWrapper(
    'Payment Overdue',
    `
    <p>Dear <strong>${customerName}</strong>,</p>
    <p style="color:#ef4444;font-weight:bold;">Your invoice ${invoice.invoiceNumber} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#fef2f2;"><td style="padding:8px;font-size:13px;color:#64748b;">Invoice #</td><td style="padding:8px;font-weight:bold;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="padding:8px;font-size:13px;color:#64748b;">Due Date</td><td style="padding:8px;color:#ef4444;">${fmtDate(invoice.dueDate)}</td></tr>
      <tr style="background:#fef2f2;"><td style="padding:8px;font-size:13px;color:#64748b;">Balance Due</td><td style="padding:8px;font-weight:bold;color:#ef4444;font-size:18px;">${fmt(invoice.balanceDue)}</td></tr>
    </table>
    <p style="font-size:13px;color:#64748b;">Please make payment immediately to avoid service suspension.</p>
  `
  );

  const text = `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue. Balance: ${fmt(invoice.balanceDue)}`;
  return sendEmail(
    to,
    `⚠ Overdue: Invoice ${invoice.invoiceNumber} — ${fmt(invoice.balanceDue)}`,
    text,
    html
  );
};

const sendSuspensionWarningEmail = async (
  to: string,
  customerName: string,
  daysUntilSuspend: number,
  invoice: any
) => {
  const html = billingWrapper(
    'Service Suspension Warning',
    `
    <p>Dear <strong>${customerName}</strong>,</p>
    <p style="color:#f59e0b;font-weight:bold;">Your service will be suspended in ${daysUntilSuspend} day${daysUntilSuspend > 1 ? 's' : ''} due to unpaid invoice.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#fffbeb;"><td style="padding:8px;font-size:13px;color:#64748b;">Invoice #</td><td style="padding:8px;font-weight:bold;">${invoice.invoiceNumber}</td></tr>
      <tr><td style="padding:8px;font-size:13px;color:#64748b;">Balance Due</td><td style="padding:8px;font-weight:bold;color:#ef4444;font-size:18px;">${fmt(invoice.balanceDue)}</td></tr>
    </table>
    <p style="font-size:13px;color:#64748b;">Please pay your outstanding balance to continue enjoying uninterrupted service.</p>
  `
  );

  const text = `Warning: Your service will be suspended in ${daysUntilSuspend} days. Invoice ${invoice.invoiceNumber} — Balance: ${fmt(invoice.balanceDue)}`;
  return sendEmail(
    to,
    `⚠ Suspension Warning — ${daysUntilSuspend} day${daysUntilSuspend > 1 ? 's' : ''} remaining`,
    text,
    html
  );
};

const sendServiceSuspendedEmail = async (to: string, customerName: string, reason: string) => {
  const html = billingWrapper(
    'Service Suspended',
    `
    <p>Dear <strong>${customerName}</strong>,</p>
    <p style="color:#ef4444;font-weight:bold;">Your internet service has been suspended.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p style="font-size:13px;color:#64748b;">To restore your service, please clear your outstanding balance. Once payment is confirmed, your service will be reactivated automatically.</p>
  `
  );

  const text = `Your service has been suspended. Reason: ${reason}. Please pay your outstanding balance to restore service.`;
  return sendEmail(to, 'Service Suspended — Action Required', text, html);
};

const sendServiceReactivatedEmail = async (to: string, customerName: string) => {
  const html = billingWrapper(
    'Service Reactivated',
    `
    <p>Dear <strong>${customerName}</strong>,</p>
    <p style="color:#10b981;font-weight:bold;">✓ Your internet service has been reactivated!</p>
    <p>Thank you for your payment. Your connection should be restored within a few minutes.</p>
  `
  );

  const text = `Your service has been reactivated. Thank you for your payment.`;
  return sendEmail(to, "✓ Service Reactivated — You're Back Online", text, html);
};

export const verifySmtpConnection = async () => {
  try {
    await transporter.verify();
    logger.info('SMTP server is reachable and ready to send emails.');
  } catch (error) {
    logger.error('SMTP server is NOT reachable:', error);
    // Don't re-throw - this is just a warning, not a critical error
  }
};

export default {
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendAccountLockoutEmail,
  sendSecurityUpdateEmail,
  sendPasswordExpiryEmail,
  sendSuspiciousActivityEmail,
  sendDeviceLoginEmail,
  sendPasswordChangeEmail,
  sendTwoFactorEmail,
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
  verifySmtpConnection,
  checkEmailServiceHealth,
  transporter,
  // Billing emails
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendOverdueReminderEmail,
  sendSuspensionWarningEmail,
  sendServiceSuspendedEmail,
  sendServiceReactivatedEmail,
};
