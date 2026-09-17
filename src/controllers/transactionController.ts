import { Request, Response } from 'express';
import { processTransactionIn, processTransactionOut } from '../services/transactionService';
import { AppError } from '../utils/AppError';

export const createTransactionIn = async (req: Request, res: Response) => {
    const { warehouseId, createdByUserId, items } = req.body;

    if (!warehouseId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete data! Please include warehouseId, createdByUserId, and items.', 400);
    }

    const result = await processTransactionIn(Number(warehouseId), Number(createdByUserId), items);

    return res.status(201).json({
        success: true,
        message: 'Incoming Item Transaction (IN) successfully recorded and warehouse stock increased!',
        data: result,
    });
};

export const createTransactionOut = async (req: Request, res: Response) => {
    const { warehouseId, createdByUserId, items } = req.body;

    if (!warehouseId || !createdByUserId || !items || items.length === 0) {
        throw new AppError('Incomplete data! Please include warehouseId, createdByUserId, and items.', 400);
    }

    const result = await processTransactionOut(Number(warehouseId), Number(createdByUserId), items);

    return res.status(201).json({
        success: true,
        message: 'Outgoing Item Transaction (OUT) successfully recorded and warehouse stock decreased!',
        data: result,
    });
};