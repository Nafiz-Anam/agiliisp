import express from 'express';
import authRoute from './auth.route';
import userRoute from './user.route';
import meRoute from './me.routes';

import twoFactorRoute from './twoFactor.route';
import deviceRoute from './device.route';
import profileRoute from './profile.route';
import ipSecurityRoute from './ipSecurity.route';
import pushNotificationRoute from './pushNotification.route';
import socialAuthRoute from './socialAuth.route';
import roleRoute from './role.route';
import passwordPolicyRoute from './passwordPolicy.route';
import auditLogRoute from './auditLog.route';
import sessionManagementRoute from './sessionManagement.route';
import ispDashboardRoute from './isp/dashboard.route';
import ispCustomerRoute from './isp/customer.route';
import ispOltRoute from './isp/olt.route';
import ispRouterRoute from './isp/router.route';
import ispPackageRoute from './isp/package.route';
import ispResellerRoute from './isp/reseller.route';
import ispInvoiceRoute from './isp/invoice.route';
import ispTicketRoute from './isp/ticket.route';
import ispRouterLogRoute from './isp/routerLog.route';
import ispInventoryRoute from './isp/inventory.route';
import ispReportRoute from './isp/report.route';
import ispMonitoringRoute from './isp/monitoring.route';
import ispExpenseRoute from './isp/expense.route';
import customerPortalRoute from './customerPortal.route';
import ispZoneRoute from './isp/zone.route';
import ispCollectorRoute from './isp/collector.route';
import ispMobilePaymentRoute from './isp/mobilePayment.route';
import ispBtrcRoute from './isp/btrc.route';
import ispSubnetRoute from './isp/subnet.route';
import ispSupplierRoute from './isp/supplier.route';
import ispComplianceLogRoute from './isp/complianceLog.route';
import ispAnnouncementRoute from './isp/announcement.route';
import ispBulkMessageRoute from './isp/bulkMessage.route';
import ispPayoutRoute from './isp/payout.route';
import config from '../../config/config';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/me',
    route: meRoute,
  },
  {
    path: '/2fa',
    route: twoFactorRoute,
  },
  {
    path: '/devices',
    route: deviceRoute,
  },
  {
    path: '/profile',
    route: profileRoute,
  },
  {
    path: '/ip-security',
    route: ipSecurityRoute,
  },
  {
    path: '/users',
    route: pushNotificationRoute,
  },
  {
    path: '/auth',
    route: socialAuthRoute,
  },
  {
    path: '/roles',
    route: roleRoute,
  },
  {
    path: '/password-policies',
    route: passwordPolicyRoute,
  },
  {
    path: '/audit-logs',
    route: auditLogRoute,
  },
  {
    path: '/sessions',
    route: sessionManagementRoute,
  },
  {
    path: '/isp/dashboard',
    route: ispDashboardRoute,
  },
  {
    path: '/isp/customers',
    route: ispCustomerRoute,
  },
  {
    path: '/isp/olts',
    route: ispOltRoute,
  },
  {
    path: '/isp/routers',
    route: ispRouterRoute,
  },
  {
    path: '/isp/packages',
    route: ispPackageRoute,
  },
  {
    path: '/isp/resellers',
    route: ispResellerRoute,
  },
  {
    path: '/isp/invoices',
    route: ispInvoiceRoute,
  },
  {
    path: '/isp/tickets',
    route: ispTicketRoute,
  },
  {
    path: '/isp/router-logs',
    route: ispRouterLogRoute,
  },
  {
    path: '/isp/inventory',
    route: ispInventoryRoute,
  },
  {
    path: '/isp/reports',
    route: ispReportRoute,
  },
  {
    path: '/customer-portal',
    route: customerPortalRoute,
  },
  {
    path: '/isp/monitoring',
    route: ispMonitoringRoute,
  },
  {
    path: '/isp/expenses',
    route: ispExpenseRoute,
  },
  {
    path: '/isp/zones',
    route: ispZoneRoute,
  },
  {
    path: '/isp/collectors',
    route: ispCollectorRoute,
  },
  {
    path: '/isp/mobile-payments',
    route: ispMobilePaymentRoute,
  },
  {
    path: '/isp/btrc',
    route: ispBtrcRoute,
  },
  {
    path: '/isp/subnets',
    route: ispSubnetRoute,
  },
  {
    path: '/isp/suppliers',
    route: ispSupplierRoute,
  },
  {
    path: '/isp/compliance-logs',
    route: ispComplianceLogRoute,
  },
  {
    path: '/isp/announcements',
    route: ispAnnouncementRoute,
  },
  {
    path: '/isp/bulk-messages',
    route: ispBulkMessageRoute,
  },
  {
    path: '/isp/payouts',
    route: ispPayoutRoute,
  },
];

// Debug log to check route registration
defaultRoutes.forEach(route => {
  router.use(route.path, route.route);
});

// Docs route uses devDependencies (swagger-jsdoc) — lazy load only in dev
if (config.env === 'development') {
  const docsRoute = require('./docs.route').default;
  router.use('/docs', docsRoute);
}

export default router;
