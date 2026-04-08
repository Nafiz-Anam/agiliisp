import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import oltValidation from '../../../validations/ispOlt.validation';
import oltController from '../../../controllers/olt.controller';

const router = express.Router();

// Dashboard & Monitoring (must be before /:oltId to avoid param capture)
router.get('/dashboard', auth('viewOltDashboard'), oltController.getOltDashboard);

// Core OLT Management
router
  .route('/')
  .get(auth('manageOlts'), oltController.getOlts)
  .post(auth('manageOlts'), oltController.createOlt);

router
  .route('/:oltId')
  .get(auth('manageOlts'), oltController.getOltById)
  .patch(auth('manageOlts'), oltController.updateOlt)
  .delete(auth('deleteOlt'), oltController.deleteOlt);

router.post('/:oltId/approve', auth('manageOlts'), oltController.approveOlt);
router.get('/:oltId/stats', auth('manageOlts'), oltController.getOltStats);
router.get('/:oltId/alerts', auth('manageOlts'), oltController.getOltAlerts);
router.get('/:oltId/signal-history', auth('manageOlts'), oltController.getSignalHistory);
router.get('/:oltId/traffic-stats', auth('manageOlts'), oltController.getTrafficStats);

// Device Management
router.post('/:oltId/sync', auth('manageOlts'), oltController.syncOlt);
router.post('/:oltId/test-connection', auth('manageOlts'), oltController.testConnection);
router.post('/:oltId/reboot', auth('manageOlts'), oltController.rebootOlt);
router.get('/:oltId/configuration', auth('manageOlts'), oltController.getOltConfiguration);

// ONU Management
router.get('/:oltId/onus', auth('manageOlts'), oltController.getOnusByOlt);
router.post('/:oltId/onus/provision', auth('manageOlts'), oltController.provisionOnu);
router.delete('/:oltId/onus/:onuId', auth('manageOlts'), oltController.deprovisionOnu);
router.get('/:oltId/onus/:onuId', auth('manageOlts'), oltController.getOnuDetails);

// Port Management
router.get('/:oltId/ports', auth('manageOlts'), oltController.getOltPorts);
router.post('/:oltId/ports/:portId/enable', auth('manageOlts'), oltController.enablePort);
router.post('/:oltId/ports/:portId/disable', auth('manageOlts'), oltController.disablePort);
router.get('/:oltId/ports/:portId', auth('manageOlts'), oltController.getPortDetails);

// Maintenance
router.get(
  '/:oltId/maintenance-schedule',
  auth('manageOlts'),
  oltController.getMaintenanceSchedule
);
router.post(
  '/:oltId/maintenance-schedule',
  auth('manageOlts'),
  oltController.createMaintenanceSchedule
);

export default router;
