import { Router } from 'express';
// Import controller yang udah bersih tadi
import { createTransactionIn, createTransactionOut } from '../controllers/transactionController';

const router = Router();

// Endpoint untuk Barang Masuk (IN)
router.post('/in', createTransactionIn);

// Endpoint untuk Barang Keluar (OUT)
router.post('/out', createTransactionOut);

export default router;