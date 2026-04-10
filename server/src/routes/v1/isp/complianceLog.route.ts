import express from 'express';
import auth from '../../../middlewares/auth';
import complianceLogController from '../../../controllers/complianceLog.controller';

const router = express.Router();

router.get('/stats', auth('manageCustomers'), complianceLogController.getStats);
router.get('/sessions', auth('manageCustomers'), complianceLogController.getSessionLogs);
router.get('/nat', auth('manageCustomers'), complianceLogController.getNatLogs);
router.get('/auth', auth('manageCustomers'), complianceLogController.getAuthLogs);
router.get('/ip-lookup', auth('manageCustomers'), complianceLogController.lookupIp);
router.get('/export', auth('manageCustomers'), complianceLogController.exportLogs);

export default router;
