import express from 'express';
import auth from '../../../middlewares/auth';
import payoutController from '../../../controllers/payout.controller';

const router = express.Router();

// Admin payout management
router.get('/', auth('manageResellers'), payoutController.getPayouts);
router.patch('/:payoutId/approve', auth('manageResellers'), payoutController.approvePayout);
router.patch('/:payoutId/reject', auth('manageResellers'), payoutController.rejectPayout);

export default router;
