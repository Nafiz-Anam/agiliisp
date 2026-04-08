import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispCustomerValidation from '../../../validations/ispCustomer.validation';
import ispCustomerController from '../../../controllers/ispCustomer.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('manageCustomers'), validate(ispCustomerValidation.getCustomers), ispCustomerController.getCustomers)
  .post(auth('manageCustomers'), validate(ispCustomerValidation.createCustomer), ispCustomerController.createCustomer);

router
  .route('/:customerId')
  .get(auth('manageCustomers'), validate(ispCustomerValidation.customerId), ispCustomerController.getCustomerById)
  .patch(auth('manageCustomers'), validate(ispCustomerValidation.updateCustomer), ispCustomerController.updateCustomer)
  .delete(auth('deleteCustomer'), validate(ispCustomerValidation.customerId), ispCustomerController.deleteCustomer);

router.get(
  '/:customerId/stats',
  auth('manageCustomers'),
  validate(ispCustomerValidation.customerId),
  ispCustomerController.getCustomerStats
);

router.get(
  '/:customerId/connection-status',
  auth('manageCustomers'),
  validate(ispCustomerValidation.customerId),
  ispCustomerController.getConnectionStatus
);

router.get(
  '/:customerId/traffic-stats',
  auth('manageCustomers'),
  validate(ispCustomerValidation.trafficStats),
  ispCustomerController.getTrafficStats
);

router.post(
  '/:customerId/suspend',
  auth('manageCustomers'),
  validate(ispCustomerValidation.suspendCustomer),
  ispCustomerController.suspendCustomer
);

router.post(
  '/:customerId/activate',
  auth('manageCustomers'),
  validate(ispCustomerValidation.customerId),
  ispCustomerController.activateCustomer
);

router.post(
  '/:customerId/sync-to-router',
  auth('manageCustomers'),
  validate(ispCustomerValidation.customerId),
  ispCustomerController.syncToRouter
);

export default router;
