import { Router } from 'express';
import {
    createPurchaseOrder,
    getAllPurchaseOrders,
    approvePurchaseOrder,
    receivePurchaseOrder
} from '../controllers/poController';

const router = Router();

// Endpoint to create a new PO (POST)
router.post('/', createPurchaseOrder);

// Endpoint to view all POs (GET)
router.get('/', getAllPurchaseOrders);

// Endpoint for Manager to Approve a PO (PATCH)
router.patch('/:id/approve', approvePurchaseOrder);

// Endpoint for Warehouse Staff to receive items from a PO (POST)
router.post('/:id/receive', receivePurchaseOrder);

export default router;