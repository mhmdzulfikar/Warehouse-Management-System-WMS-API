import { Router } from 'express';
// Import the clean controller we just made
import { createTransactionIn, createTransactionOut } from '../controllers/transactionController';

const router = Router();

// Endpoint for Incoming Items (IN)
router.post('/in', createTransactionIn);

// Endpoint for Outgoing Items (OUT)
router.post('/out', createTransactionOut);

export default router;