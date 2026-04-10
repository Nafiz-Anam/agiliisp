import express from 'express';
import auth from '../../../middlewares/auth';
import collectorController from '../../../controllers/collector.controller';

const router = express.Router();

// Collections
router.get('/collections', auth('manageInvoices'), collectorController.getCollections);
router.post('/collections', auth('manageInvoices'), collectorController.recordCollection);
router.post('/collections/:collectionId/reconcile', auth('manageInvoices'), collectorController.reconcileCollection);

// Collectors CRUD
router
  .route('/')
  .get(auth('manageCustomers'), collectorController.getCollectors)
  .post(auth('manageCustomers'), collectorController.createCollector);

router
  .route('/:collectorId')
  .get(auth('manageCustomers'), collectorController.getCollectorById)
  .patch(auth('manageCustomers'), collectorController.updateCollector)
  .delete(auth('manageCustomers'), collectorController.deleteCollector);

router.get('/:collectorId/summary', auth('manageInvoices'), collectorController.getCollectorSummary);

export default router;
