import express from 'express';
import auth from '../../../middlewares/auth';
import validate from '../../../middlewares/validate';
import ispRouterLogValidation from '../../../validations/ispRouterLog.validation';
import ispRouterLogController from '../../../controllers/ispRouterLog.controller';

const router = express.Router();

router.get('/', auth('viewRouterLogs'), validate(ispRouterLogValidation.getRouterLogs), ispRouterLogController.getRouterLogs);

export default router;
