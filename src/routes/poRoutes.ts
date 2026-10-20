import { Router } from 'express';
import {
    createPurchaseOrder,
    getAllPurchaseOrders,
    approvePurchaseOrder,
    receivePurchaseOrder
} from '../controllers/poController';
import { checkIsLoggedIn, checkRole, checkIsManager } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createPoSchema, approvePoSchema, receivePoSchema } from '../validations/poValidation';

const router = Router();

// 1. POST /api/po -> Create a new PO (Purchasing, Manager, Admin)
router.post(
    '/',
    checkIsLoggedIn,
    checkRole(['Purchasing', 'Manager', 'Admin']),
    validateRequest(createPoSchema),
    createPurchaseOrder
);

// 2. GET /api/po -> View all POs (Authenticated users)
router.get('/', checkIsLoggedIn, getAllPurchaseOrders);

// 3. PATCH /api/po/:id/approve -> Manager / Admin approves a PO
router.patch(
    '/:id/approve',
    checkIsLoggedIn,
    checkIsManager,
    validateRequest(approvePoSchema),
    approvePurchaseOrder
);

// 4. POST /api/po/:id/receive -> Staff Gudang / Manager / Admin receives items
router.post(
    '/:id/receive',
    checkIsLoggedIn,
    checkRole(['Staff Gudang', 'Manager', 'Admin']),
    validateRequest(receivePoSchema),
    receivePurchaseOrder
);

export default router;