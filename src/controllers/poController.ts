import { Request, Response } from 'express';
import { processCreatePO, fetchAllPOs, processApprovePO, processReceivePO } from '../services/poService';
import { AppError } from '../utils/AppError';

export const createPurchaseOrder = async (req: Request, res: Response) => {
    const { supplierId, items } = req.body;
    const createdByUserId = req.user?.userId || req.body.createdByUserId;

    if (!createdByUserId) {
        throw new AppError('Incomplete PO Data! Please provide createdByUserId or log in.', 400);
    }

    const result = await processCreatePO(Number(supplierId), Number(createdByUserId), items);
    return res.status(201).json({ success: true, message: 'Purchase Order successfully created!', data: result });
};

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
    const { page, limit, status, supplierId } = req.query;

    const result = await fetchAllPOs({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as string | undefined,
        supplierId: supplierId ? Number(supplierId) : undefined
    });

    return res.status(200).json({
        success: true,
        message: 'Successfully retrieved Purchase Order list',
        data: result.data,
        pagination: result.pagination
    });
};

export const approvePurchaseOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const approvedByUserId = req.user?.userId || req.body.approvedByUserId;

    if (!approvedByUserId) {
        throw new AppError('Please include approvedByUserId or log in as an authorized user.', 400);
    }

    const result = await processApprovePO(Number(id), Number(approvedByUserId));
    return res.status(200).json({ success: true, message: `Purchase Order ID ${id} successfully APPROVED!`, data: result });
};

export const receivePurchaseOrder = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { warehouseId, items } = req.body;
    const receivedByUserId = req.user?.userId || req.body.receivedByUserId;

    if (!warehouseId || !receivedByUserId) {
        throw new AppError('Please include warehouseId and receivedByUserId or log in.', 400);
    }

    const result = await processReceivePO(Number(id), Number(warehouseId), Number(receivedByUserId), items);
    return res.status(201).json({
        success: true,
        message: `PO items successfully received. Status is now: ${result.updatedPo.status}`,
        data: result
    });
};