import { Router } from 'express';
// Import Satpam yang udah lu bikin tadi
import { getInventoryStock, getDashboardReport } from '../controllers/inventoryController';
import { checkIsLoggedIn, checkIsManager } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint lama untuk ambil semua stok
router.get('/', getInventoryStock);

// Middleware
router.get('/report/:warehouseId', checkIsLoggedIn, checkIsManager, getDashboardReport);

// Kita bikin jalur GET.
// Perhatikan ada :warehouseId di situ, ini yang bakal ditangkap oleh req.params!
router.get('/report/:warehouseId', getDashboardReport);

export default router;