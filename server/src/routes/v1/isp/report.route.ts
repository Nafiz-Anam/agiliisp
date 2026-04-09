import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import reportValidation from '../../../validations/report.validation';
import reportController from '../../../controllers/report.controller';

const router = express.Router();

router.get('/revenue', auth('manageInvoices'), validate(reportValidation.revenueReport), reportController.getRevenueReport);
router.get('/collection', auth('manageInvoices'), validate(reportValidation.collectionReport), reportController.getCollectionReport);
router.get('/aging', auth('manageInvoices'), reportController.getAgingReport);
router.get('/customer-revenue', auth('manageInvoices'), validate(reportValidation.customerRevenueReport), reportController.getCustomerRevenueReport);
router.get('/export/:type/:format', auth('manageInvoices'), validate(reportValidation.exportReport), reportController.exportReport);

export default router;
