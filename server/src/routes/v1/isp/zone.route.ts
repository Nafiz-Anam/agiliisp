import express from 'express';
import auth from '../../../middlewares/auth';
import zoneController from '../../../controllers/zone.controller';

const router = express.Router();

router.get('/tree', auth('manageCustomers'), zoneController.getZoneTree);

router
  .route('/')
  .get(auth('manageCustomers'), zoneController.getZones)
  .post(auth('manageCustomers'), zoneController.createZone);

router
  .route('/:zoneId')
  .get(auth('manageCustomers'), zoneController.getZoneById)
  .patch(auth('manageCustomers'), zoneController.updateZone)
  .delete(auth('manageCustomers'), zoneController.deleteZone);

export default router;
