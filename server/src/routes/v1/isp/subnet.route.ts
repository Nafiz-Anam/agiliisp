import express from 'express';
import auth from '../../../middlewares/auth';
import subnetController from '../../../controllers/subnet.controller';

const router = express.Router();

// Utility
router.get('/calc', auth('manageRouters'), subnetController.getNetworkInfo);

// Pools CRUD
router
  .route('/')
  .get(auth('manageRouters'), subnetController.getPools)
  .post(auth('manageRouters'), subnetController.createPool);

router
  .route('/:poolId')
  .get(auth('manageRouters'), subnetController.getPoolById)
  .patch(auth('manageRouters'), subnetController.updatePool)
  .delete(auth('manageRouters'), subnetController.deletePool);

// IP assignment
router.get('/:poolId/next-ip', auth('manageRouters'), subnetController.getNextAvailableIp);
router.post('/:poolId/assign', auth('manageRouters'), subnetController.assignIp);
router.get('/:poolId/assignments', auth('manageRouters'), subnetController.getPoolAssignments);
router.post('/assignments/:assignmentId/release', auth('manageRouters'), subnetController.releaseIp);

export default router;
