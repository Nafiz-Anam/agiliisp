import express from 'express';
import auth from '../../../middlewares/auth';
import btrcController from '../../../controllers/btrc.controller';

const router = express.Router();

router.get('/subscribers', auth('manageCustomers'), btrcController.getSubscriberReport);
router.get('/bandwidth', auth('manageCustomers'), btrcController.getBandwidthReport);
router.get('/connection-logs', auth('manageCustomers'), btrcController.getConnectionLogReport);

export default router;
