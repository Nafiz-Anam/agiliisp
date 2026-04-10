import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispCustomerValidation from '../../../validations/ispCustomer.validation';
import ispCustomerController from '../../../controllers/ispCustomer.controller';
import customerNoteController from '../../../controllers/customerNote.controller';
import { uploadDocuments, uploadImage } from '../../../middlewares/upload';

const router = express.Router();

router
  .route('/')
  .get(auth('manageCustomers'), validate(ispCustomerValidation.getCustomers), ispCustomerController.getCustomers)
  .post(auth('manageCustomers'), validate(ispCustomerValidation.createCustomer), ispCustomerController.createCustomer);

// Bulk operations (before /:customerId to avoid conflict)
router.post('/bulk-suspend', auth('manageCustomers'), ispCustomerController.bulkSuspend);
router.post('/bulk-activate', auth('manageCustomers'), ispCustomerController.bulkActivate);
router.post('/bulk-change-package', auth('manageCustomers'), ispCustomerController.bulkChangePackage);

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

// Quick diagnostics
router.post('/:customerId/restart-connection', auth('manageCustomers'), ispCustomerController.restartConnection);
router.post('/:customerId/reset-password', auth('manageCustomers'), ispCustomerController.resetPassword);
router.get('/:customerId/check-router', auth('manageCustomers'), ispCustomerController.checkRouter);
router.get('/:customerId/connection-details', auth('manageCustomers'), ispCustomerController.getDetailedConnection);
router.post('/:customerId/send-message', auth('manageCustomers'), ispCustomerController.sendMessage);

// Customer notes / interaction log
router.get('/:customerId/notes', auth('manageCustomers'), customerNoteController.getNotes);
router.post('/:customerId/notes', auth('manageCustomers'), customerNoteController.addNote);
router.delete('/:customerId/notes/:noteId', auth('manageCustomers'), customerNoteController.deleteNote);

// Document uploads
router.post(
  '/:customerId/documents',
  auth('manageCustomers'),
  uploadDocuments.fields([
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 },
    { name: 'agreement', maxCount: 1 },
  ]),
  ispCustomerController.uploadDocuments
);
router.post(
  '/:customerId/profile-image',
  auth('manageCustomers'),
  uploadImage.single('profileImage'),
  ispCustomerController.uploadProfileImage
);
router.delete('/:customerId/documents/:field', auth('manageCustomers'), ispCustomerController.deleteDocument);

export default router;
