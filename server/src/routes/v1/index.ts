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
import categoryRoute from './category.route';
import productRoute from './product.route';
import orderRoute from './order.route';
import restockRoute from './restock.route';
import dashboardRoute from './dashboard.route';
import inventoryActivityRoute from './inventoryActivity.route';
import ispDashboardRoute from './isp/dashboard.route';
import ispCustomerRoute from './isp/customer.route';
import ispRouterRoute from './isp/router.route';
import ispPackageRoute from './isp/package.route';
import ispResellerRoute from './isp/reseller.route';
import ispInvoiceRoute from './isp/invoice.route';
import ispTicketRoute from './isp/ticket.route';
import ispRouterLogRoute from './isp/routerLog.route';
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
    path: '/categories',
    route: categoryRoute,
  },
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/orders',
    route: orderRoute,
  },
  {
    path: '/restock-queue',
    route: restockRoute,
  },
  {
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/activity-log',
    route: inventoryActivityRoute,
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
