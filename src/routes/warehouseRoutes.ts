import { Router } from 'express';
import { 
    fetchAllWarehouses, 
    fetchWarehouseById, 
    addWarehouse, 
    editWarehouse, 
    removeWarehouse 
} from '../controllers/warehouseController';

import { checkIsLoggedIn, checkIsManager } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createWarehouseSchema, updateWarehouseSchema } from '../validations/warehouseValidation';

const router = Router();

// ==========================================
// ROUTES UNTUK WAREHOUSE (GUDANG)
// ==========================================

// 1. GET /api/warehouses
router.get('/', checkIsLoggedIn, fetchAllWarehouses);

// 2. GET /api/warehouses/:id
router.get('/:id', checkIsLoggedIn, fetchWarehouseById);

// 3. POST /api/warehouses
router.post('/', checkIsLoggedIn, checkIsManager, validateRequest(createWarehouseSchema), addWarehouse);

// 4. PUT /api/warehouses/:id
router.put('/:id', checkIsLoggedIn, checkIsManager, validateRequest(updateWarehouseSchema), editWarehouse);

// 5. DELETE /api/warehouses/:id
router.delete('/:id', checkIsLoggedIn, checkIsManager, removeWarehouse);

export default router;
