import { Router } from 'express';
// Import the Security Guard (Middleware) that we just made
import { getInventoryStock, getDashboardReport } from '../controllers/inventoryController';
import { checkIsLoggedIn, checkIsManager } from '../middlewares/authMiddleware';
import { getWarehouseDashboardReport } from '../services/inventoryService';

const router = Router();

// Endpoint to fetch all stocks
router.get('/', getInventoryStock);

// Endpoint with Middleware
router.get('/report/:warehouseId', checkIsLoggedIn, checkIsManager, getDashboardReport);

// Note: there's :warehouseId here, this will be captured by req.params!
// This is an alternative GET route.
// router.get('/report/:warehouseId', getDashboardReport);

export default router;