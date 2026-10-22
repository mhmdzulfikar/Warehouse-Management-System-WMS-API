import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { checkIsLoggedIn } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/dashboard/stats -> Aggregated KPI metrics, critical alerts, and charts data
router.get('/stats', checkIsLoggedIn, getDashboardStats);

export default router;
