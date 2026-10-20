import { Router } from 'express';
import { getInventoryStock, getDashboardReport } from '../controllers/inventoryController';
import { checkIsLoggedIn, checkIsManager } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint to fetch all stocks (Requires login)
router.get('/', checkIsLoggedIn, getInventoryStock);

// Endpoint for dashboard report (Requires Manager or Admin)
router.get('/report/:warehouseId', checkIsLoggedIn, checkIsManager, getDashboardReport);

export default router;