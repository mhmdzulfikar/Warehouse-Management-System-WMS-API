import { Router } from 'express';
import { 
    fetchAllProducts, 
    fetchProductById, 
    addProduct, 
    editProduct, 
    removeProduct 
} from '../controllers/productController';

import { checkIsLoggedIn, checkIsManager } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createProductSchema, updateProductSchema } from '../validations/productValidation';

const router = Router();

// ==========================================
// KITA DAFTARKAN MENU (ROUTES) DI SINI
// ==========================================

// 1. GET /api/products -> Ambil semua barang
// Boleh diakses siapa saja yang sudah login
router.get('/', checkIsLoggedIn, fetchAllProducts);

// 2. GET /api/products/:id -> Ambil satu barang berdasarkan ID
// Boleh diakses siapa saja yang sudah login
router.get('/:id', checkIsLoggedIn, fetchProductById);

// 3. POST /api/products -> Bikin barang baru
// HANYA BOLEH diakses oleh MANAGER!
// Tambahkan validateRequest di sini
router.post('/', checkIsLoggedIn, checkIsManager, validateRequest(createProductSchema), addProduct);

// 4. PUT /api/products/:id -> Update barang
// HANYA BOLEH diakses oleh MANAGER!
// Tambahkan validateRequest di sini
router.put('/:id', checkIsLoggedIn, checkIsManager, validateRequest(updateProductSchema), editProduct);

// 5. DELETE /api/products/:id -> Hapus barang (Soft Delete)
// HANYA BOLEH diakses oleh MANAGER!
router.delete('/:id', checkIsLoggedIn, checkIsManager, removeProduct);

export default router;
