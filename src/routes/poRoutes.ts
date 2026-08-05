import { Router } from 'express';
import {
    createPurchaseOrder,
    getAllPurchaseOrders,
    approvePurchaseOrder,
    receivePurchaseOrder
} from '../controllers/poController';

const router = Router();

// Ednpoint untuk bikin PO baru (POST)
router.post('/', createPurchaseOrder);

// Endpoint untuk lihat semua PO (GET)
router.get('/', getAllPurchaseOrders);

// Endpoint untutk Manger nge-Approve PO (PUT)
router.patch('/:id/approve', approvePurchaseOrder);

// Endpoint untuk Staf Gudang menerima barang dari PO (POST)
router.post('/:id/receive', receivePurchaseOrder);

export default router;