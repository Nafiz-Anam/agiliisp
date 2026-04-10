import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import monitoringValidation from '../../../validations/monitoring.validation';
import monitoringController from '../../../controllers/monitoring.controller';

const router = express.Router();

router.get('/overview', auth('manageRouters'), monitoringController.getOverview);
router.get('/devices/:deviceId/metrics', auth('manageRouters'), validate(monitoringValidation.getDeviceMetrics), monitoringController.getDeviceMetrics);
router.get('/alerts', auth('manageRouters'), validate(monitoringValidation.getAlerts), monitoringController.getAlerts);
router.post('/alerts/:alertId/acknowledge', auth('manageRouters'), validate(monitoringValidation.alertId), monitoringController.acknowledgeAlert);
router.post('/alerts/:alertId/resolve', auth('manageRouters'), validate(monitoringValidation.alertId), monitoringController.resolveAlert);
router.get('/config/:deviceId', auth('manageRouters'), validate(monitoringValidation.deviceId), monitoringController.getConfig);
router.patch('/config/:deviceId', auth('manageRouters'), validate(monitoringValidation.updateConfig), monitoringController.updateConfig);
router.post('/devices/:deviceId/poll', auth('manageRouters'), validate(monitoringValidation.triggerPoll), monitoringController.triggerPoll);

// Topology & Live traffic
router.get('/topology', auth('manageRouters'), monitoringController.getTopology);
router.get('/live-bandwidth', auth('manageRouters'), monitoringController.getLiveBandwidth);
router.get('/active-connections', auth('manageRouters'), monitoringController.getActiveConnections);
router.get('/customers/:customerId/traffic', auth('manageCustomers'), monitoringController.getCustomerTraffic);
router.post('/disconnect-user', auth('manageRouters'), monitoringController.disconnectUser);

export default router;
