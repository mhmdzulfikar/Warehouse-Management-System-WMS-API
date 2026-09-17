import { Router } from 'express';
import { 
    fetchAllSuppliers, 
    fetchSupplierById, 
    addSupplier, 
    editSupplier, 
    removeSupplier 
} from '../controllers/supplierController';

import { checkIsLoggedIn, checkIsManager } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createSupplierSchema, updateSupplierSchema } from '../validations/supplierValidation';

const router = Router();

// ==========================================
// KITA DAFTARKAN MENU (ROUTES) DI SINI
// ==========================================

// 1. GET /api/suppliers -> Ambil semua supplier
router.get('/', checkIsLoggedIn, fetchAllSuppliers);

// 2. GET /api/suppliers/:id -> Ambil satu supplier berdasarkan ID
router.get('/:id', checkIsLoggedIn, fetchSupplierById);

// 3. POST /api/suppliers -> Bikin supplier baru
router.post('/', checkIsLoggedIn, checkIsManager, validateRequest(createSupplierSchema), addSupplier);

// 4. PUT /api/suppliers/:id -> Update supplier
router.put('/:id', checkIsLoggedIn, checkIsManager, validateRequest(updateSupplierSchema), editSupplier);

// 5. DELETE /api/suppliers/:id -> Hapus supplier (Soft Delete)
router.delete('/:id', checkIsLoggedIn, checkIsManager, removeSupplier);

export default router;
