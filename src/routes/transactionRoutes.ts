import { Router } from 'express';
import {
    createTransactionIn,
    createTransactionOut,
    createTransactionAdjust,
    createTransferStock,
    fetchAllTransactions
} from '../controllers/transactionController';
import { checkIsLoggedIn, checkRole, checkIsManager } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import {
    createTransactionSchema,
    adjustTransactionSchema,
    transferStockSchema
} from '../validations/transactionValidation';

const router = Router();

// 1. GET /api/transactions -> View transaction ledger history
router.get('/', checkIsLoggedIn, fetchAllTransactions);

// 2. POST /api/transactions/in -> Incoming Items (IN) - Staff Gudang, Manager, Admin
router.post(
    '/in',
    checkIsLoggedIn,
    checkRole(['Staff Gudang', 'Manager', 'Admin']),
    validateRequest(createTransactionSchema),
    createTransactionIn
);

// 3. POST /api/transactions/out -> Outgoing Items (OUT) - Staff Gudang, Manager, Admin
router.post(
    '/out',
    checkIsLoggedIn,
    checkRole(['Staff Gudang', 'Manager', 'Admin']),
    validateRequest(createTransactionSchema),
    createTransactionOut
);

// 4. POST /api/transactions/adjust -> Stock Opname / Adjustment - Manager, Admin only
router.post(
    '/adjust',
    checkIsLoggedIn,
    checkIsManager,
    validateRequest(adjustTransactionSchema),
    createTransactionAdjust
);

// 5. POST /api/transactions/transfer -> Inter-Warehouse Transfer - Staff Gudang, Manager, Admin
router.post(
    '/transfer',
    checkIsLoggedIn,
    checkRole(['Staff Gudang', 'Manager', 'Admin']),
    validateRequest(transferStockSchema),
    createTransferStock
);

export default router;