import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispTicketValidation from '../../../validations/ispTicket.validation';
import ispTicketController from '../../../controllers/ispTicket.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('manageTickets'), validate(ispTicketValidation.getTickets), ispTicketController.getTickets)
  .post(auth('manageTickets'), validate(ispTicketValidation.createTicket), ispTicketController.createTicket);

router
  .route('/:ticketId')
  .get(auth('manageTickets'), validate(ispTicketValidation.ticketId), ispTicketController.getTicketById)
  .patch(auth('manageTickets'), validate(ispTicketValidation.updateTicket), ispTicketController.updateTicket);

router.post('/:ticketId/replies', auth('manageTickets'), validate(ispTicketValidation.addReply), ispTicketController.addReply);

export default router;
