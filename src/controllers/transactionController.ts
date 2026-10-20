import { Request, Response } from 'express';
import {
    processTransactionIn,
    processTransactionOut,
    processTransactionAdjust,
    processTransferStock,
    getAllTransactions
} from '../services/transactionService';
import { AppError } from '../utils/AppError';

export const fetchAllTransactions = async (req: Request, res: Response) => {
    const { page, limit, type } = req.query;
    const result = await getAllTransactions({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        type: type as string | undefined
    });

    return res.status(200).json({
        success: true,
        message: 'Successfully retrieved transaction ledger',
        data: result.data,
        pagination: result.pagination
    });
};

export const createTransactionIn = async (req: Request, res: Response) => {
    const { warehouseId, items } = req.body;
    const createdByUserId = req.user?.userId || req.body.createdByUserId;

    if (!warehouseId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete data! Please include warehouseId, items, and log in or provide createdByUserId.', 400);
    }

    const result = await processTransactionIn(Number(warehouseId), Number(createdByUserId), items);

    return res.status(201).json({
        success: true,
        message: 'Incoming Item Transaction (IN) successfully recorded and warehouse stock increased!',
        data: result,
    });
};

export const createTransactionOut = async (req: Request, res: Response) => {
    const { warehouseId, items } = req.body;
    const createdByUserId = req.user?.userId || req.body.createdByUserId;

    if (!warehouseId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete data! Please include warehouseId, items, and log in or provide createdByUserId.', 400);
    }

    const result = await processTransactionOut(Number(warehouseId), Number(createdByUserId), items);

    return res.status(201).json({
        success: true,
        message: 'Outgoing Item Transaction (OUT) successfully recorded and warehouse stock decreased!',
        data: result,
    });
};

export const createTransactionAdjust = async (req: Request, res: Response) => {
    const { warehouseId, items, reason } = req.body;
    const createdByUserId = req.user?.userId || req.body.createdByUserId;

    if (!warehouseId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete data! Please include warehouseId, items, and log in or provide createdByUserId.', 400);
    }

    const result = await processTransactionAdjust(Number(warehouseId), Number(createdByUserId), items, reason);

    return res.status(201).json({
        success: true,
        message: 'Stock adjustment (Opname) successfully recorded and inventory updated!',
        data: result,
    });
};

export const createTransferStock = async (req: Request, res: Response) => {
    const { sourceWarehouseId, targetWarehouseId, items, notes } = req.body;
    const createdByUserId = req.user?.userId || req.body.createdByUserId;

    if (!sourceWarehouseId || !targetWarehouseId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete data! Please include sourceWarehouseId, targetWarehouseId, items, and log in.', 400);
    }

    const result = await processTransferStock(
        Number(sourceWarehouseId),
        Number(targetWarehouseId),
        Number(createdByUserId),
        items,
        notes
    );

    return res.status(201).json({
        success: true,
        message: 'Stock transfer between warehouses successfully executed!',
        data: result,
    });
};