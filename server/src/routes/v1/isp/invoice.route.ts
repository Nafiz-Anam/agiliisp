import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispInvoiceValidation from '../../../validations/ispInvoice.validation';
import ispInvoiceController from '../../../controllers/ispInvoice.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('manageInvoices'), validate(ispInvoiceValidation.getInvoices), ispInvoiceController.getInvoices)
  .post(auth('manageInvoices'), validate(ispInvoiceValidation.createInvoice), ispInvoiceController.createInvoice);

// IMPORTANT: /auto-generate must come before /:invoiceId to prevent Express matching it as an ID
router.post('/auto-generate', auth('manageInvoices'), validate(ispInvoiceValidation.autoGenerate), ispInvoiceController.autoGenerateInvoices);

router.get('/:invoiceId', auth('manageInvoices'), validate(ispInvoiceValidation.invoiceId), ispInvoiceController.getInvoiceById);
router.post('/:invoiceId/payments', auth('manageInvoices'), validate(ispInvoiceValidation.addPayment), ispInvoiceController.addPayment);

export default router;
