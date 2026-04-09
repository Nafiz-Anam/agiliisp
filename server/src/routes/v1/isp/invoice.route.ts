import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispInvoiceValidation from '../../../validations/ispInvoice.validation';
import ispInvoiceController from '../../../controllers/ispInvoice.controller';

const router = express.Router();

// Static routes before /:invoiceId
router.get('/dashboard', auth('manageInvoices'), ispInvoiceController.getBillingDashboard);
router.get('/payments', auth('manageInvoices'), ispInvoiceController.getPayments);
router.post('/auto-generate', auth('manageInvoices'), validate(ispInvoiceValidation.autoGenerate), ispInvoiceController.autoGenerateInvoices);
router.post('/bulk-send', auth('manageInvoices'), ispInvoiceController.bulkSendInvoices);

router
  .route('/')
  .get(auth('manageInvoices'), validate(ispInvoiceValidation.getInvoices), ispInvoiceController.getInvoices)
  .post(auth('manageInvoices'), validate(ispInvoiceValidation.createInvoice), ispInvoiceController.createInvoice);

router.get('/:invoiceId/pdf', auth('manageInvoices'), validate(ispInvoiceValidation.invoiceId), ispInvoiceController.downloadInvoicePDF);
router.get('/:invoiceId', auth('manageInvoices'), validate(ispInvoiceValidation.invoiceId), ispInvoiceController.getInvoiceById);
router.post('/:invoiceId/payments', auth('manageInvoices'), validate(ispInvoiceValidation.addPayment), ispInvoiceController.addPayment);
router.post('/:invoiceId/send', auth('manageInvoices'), ispInvoiceController.markInvoiceSent);

export default router;
