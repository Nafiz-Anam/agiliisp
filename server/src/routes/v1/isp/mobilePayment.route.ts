import express from 'express';
import auth from '../../../middlewares/auth';
import mobilePaymentController from '../../../controllers/mobilePayment.controller';

const router = express.Router();

// Webhook (no auth — called externally by payment providers)
router.post('/webhook', mobilePaymentController.webhook);

// Admin endpoints
router.get('/', auth('manageInvoices'), mobilePaymentController.getMobilePayments);
router.post('/:paymentId/match', auth('manageInvoices'), mobilePaymentController.manualMatch);

export default router;
