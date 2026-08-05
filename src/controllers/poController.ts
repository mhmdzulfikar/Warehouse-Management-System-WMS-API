import { Request, Response } from 'express';
import { processCreatePO, fetchAllPOs, processApprovePO, processReceivePO } from '../services/poService';

export const createPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const { supplierId, createdByUserId, items } = req.body;

        if (!supplierId || !createdByUserId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Data PO tidak lengkap! Harap sertakan supplierId, createdByUserId, dan items.' });
        }

        const result = await processCreatePO(Number(supplierId), Number(createdByUserId), items);
        return res.status(201).json({ success: true, message: 'Purchase Order berhasil dibuat!', data: result });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Gagal membuat Purchase Order', error: error.message });
    }
};

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
    try {
        const pos = await fetchAllPOs();
        return res.status(200).json({ success: true, message: 'Berhasil mengambil daftar Purchase Order', data: pos });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: 'Gagal mengambil data PO', error: error.message });
    }
};

export const approvePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { approvedByUserId } = req.body;

        if (!approvedByUserId) return res.status(400).json({ success: false, message: 'Harap sertakan approvedByUserId.' });

        const result = await processApprovePO(Number(id), Number(approvedByUserId));
        return res.status(200).json({ success: true, message: `Purchase Order ID ${id} berhasil di-APPROVE!`, data: result });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const receivePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { warehouseId, receivedByUserId } = req.body;

        if (!warehouseId || !receivedByUserId) return res.status(400).json({ success: false, message: 'Harap sertakan warehouseId dan receivedByUserId.' });

        const result = await processReceivePO(Number(id), Number(warehouseId), Number(receivedByUserId));
        return res.status(201).json({ success: true, message: 'Barang PO berhasil diterima dan stok bertambah!', data: result });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};