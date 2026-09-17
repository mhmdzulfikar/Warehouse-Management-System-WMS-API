import { Request, Response } from 'express';
import { processCreatePO, fetchAllPOs, processApprovePO, processReceivePO } from '../services/poService';
import { AppError } from '../utils/AppError';

export const createPurchaseOrder = async (req: Request, res: Response) => {
    const { supplierId, createdByUserId, items } = req.body;

    if (!supplierId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete PO Data! Please include supplierId, createdByUserId, and items.', 400);
    }

    const result = await processCreatePO(Number(supplierId), Number(createdByUserId), items);
    return res.status(201).json({ success: true, message: 'Purchase Order successfully created!', data: result });
};

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
    const pos = await fetchAllPOs();
    return res.status(200).json({ success: true, message: 'Successfully retrieved Purchase Order list', data: pos });
};

export const approvePurchaseOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { approvedByUserId } = req.body;

    if (!approvedByUserId) {
        throw new AppError('Please include approvedByUserId.', 400);
    }

    const result = await processApprovePO(Number(id), Number(approvedByUserId));
    return res.status(200).json({ success: true, message: `Purchase Order ID ${id} successfully APPROVED!`, data: result });
};

export const receivePurchaseOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { warehouseId, receivedByUserId } = req.body;

    if (!warehouseId || !receivedByUserId) {
        throw new AppError('Please include warehouseId and receivedByUserId.', 400);
    }

    const result = await processReceivePO(Number(id), Number(warehouseId), Number(receivedByUserId));
    return res.status(201).json({ success: true, message: 'PO items successfully received and stock increased!', data: result });
};