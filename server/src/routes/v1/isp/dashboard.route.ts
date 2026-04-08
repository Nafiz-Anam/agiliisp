import express from 'express';
import auth from '../../../middlewares/auth';
import ispDashboardController from '../../../controllers/ispDashboard.controller';

const router = express.Router();

router.get('/stats', auth('viewISPDashboard'), ispDashboardController.getDashboardStats);
router.get('/system-stats', auth('viewISPDashboard'), ispDashboardController.getSystemStats);

export default router;
