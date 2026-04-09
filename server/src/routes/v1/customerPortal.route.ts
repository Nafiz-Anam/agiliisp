import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import customerPortalValidation from '../../validations/customerPortal.validation';
import customerPortalController from '../../controllers/customerPortal.controller';

const router = express.Router();

router.get('/dashboard', auth('customerPortal'), customerPortalController.getDashboard);

router.get('/invoices', auth('customerViewInvoices'), validate(customerPortalValidation.getInvoices), customerPortalController.getInvoices);
router.get('/invoices/:invoiceId', auth('customerViewInvoices'), validate(customerPortalValidation.invoiceId), customerPortalController.getInvoiceById);
router.get('/invoices/:invoiceId/pdf', auth('customerViewInvoices'), validate(customerPortalValidation.invoiceId), customerPortalController.downloadInvoicePdf);

router.get('/payments', auth('customerViewPayments'), validate(customerPortalValidation.getPayments), customerPortalController.getPayments);

router.get('/tickets', auth('customerManageTickets'), validate(customerPortalValidation.getTickets), customerPortalController.getTickets);
router.get('/tickets/:ticketId', auth('customerManageTickets'), validate(customerPortalValidation.ticketId), customerPortalController.getTicketById);
router.post('/tickets', auth('customerManageTickets'), validate(customerPortalValidation.createTicket), customerPortalController.createTicket);
router.post('/tickets/:ticketId/replies', auth('customerManageTickets'), validate(customerPortalValidation.addReply), customerPortalController.addTicketReply);

router.get('/profile', auth('customerViewProfile'), customerPortalController.getProfile);
router.patch('/profile', auth('customerUpdateProfile'), validate(customerPortalValidation.updateProfile), customerPortalController.updateProfile);
router.post('/profile/change-password', auth('customerUpdateProfile'), validate(customerPortalValidation.changePassword), customerPortalController.changePassword);

router.get('/traffic-stats', auth('customerPortal'), validate(customerPortalValidation.trafficStats), customerPortalController.getTrafficStats);

export default router;
