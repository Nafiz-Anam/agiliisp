import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispRouterValidation from '../../../validations/ispRouter.validation';
import ispRouterController from '../../../controllers/ispRouter.controller';

const router = express.Router();

router
  .route('/')
  .get(auth('manageRouters'), validate(ispRouterValidation.getRouters), ispRouterController.getRouters)
  .post(auth('manageRouters'), validate(ispRouterValidation.createRouter), ispRouterController.createRouter);

router
  .route('/:routerId')
  .get(auth('manageRouters'), validate(ispRouterValidation.routerId), ispRouterController.getRouterById)
  .patch(auth('manageRouters'), validate(ispRouterValidation.updateRouter), ispRouterController.updateRouter)
  .delete(auth('deleteRouter'), validate(ispRouterValidation.routerId), ispRouterController.deleteRouter);

router.get('/:routerId/stats', auth('manageRouters'), validate(ispRouterValidation.routerId), ispRouterController.getRouterStats);
router.post('/:routerId/test', auth('manageRouters'), validate(ispRouterValidation.routerId), ispRouterController.testConnection);
router.post('/:routerId/sync', auth('manageRouters'), validate(ispRouterValidation.routerId), ispRouterController.syncRouter);
router.get('/:routerId/active-connections', auth('manageRouters'), validate(ispRouterValidation.routerId), ispRouterController.getActiveConnections);
router.post('/:routerId/fetch-logs', auth('manageRouters'), validate(ispRouterValidation.routerId), ispRouterController.fetchLogs);
router.post('/:routerId/disconnect', auth('manageRouters'), validate(ispRouterValidation.disconnectUser), ispRouterController.disconnectUser);
router.get('/:routerId/sync-logs', auth('manageRouters'), validate(ispRouterValidation.syncLogs), ispRouterController.getSyncLogs);

export default router;
