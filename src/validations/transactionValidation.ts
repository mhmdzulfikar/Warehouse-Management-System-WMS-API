import { z } from 'zod';

export const transactionItemSchema = z.object({
    productId: z.number().int().positive('Product ID must be a positive integer'),
    qty: z.number().int().positive('Quantity must be greater than 0')
});

export const createTransactionSchema = z.object({
    warehouseId: z.number().int().positive('Warehouse ID must be a positive integer'),
    createdByUserId: z.number().int().positive('User ID must be a positive integer').optional(),
    items: z.array(transactionItemSchema).min(1, 'At least one item is required in the transaction')
});

// Stock Adjustment (Stock Opname) Schema
export const adjustItemSchema = z.object({
    productId: z.number().int().positive('Product ID must be a positive integer'),
    actualQty: z.number().int().nonnegative('Actual physical quantity cannot be negative'),
    notes: z.string().optional()
});

export const adjustTransactionSchema = z.object({
    warehouseId: z.number().int().positive('Warehouse ID must be a positive integer'),
    createdByUserId: z.number().int().positive('User ID must be a positive integer').optional(),
    reason: z.string().optional(),
    items: z.array(adjustItemSchema).min(1, 'At least one item is required for stock adjustment')
});

// Inter-Warehouse Transfer Schema
export const transferItemSchema = z.object({
    productId: z.number().int().positive('Product ID must be a positive integer'),
    qty: z.number().int().positive('Transfer quantity must be greater than 0')
});

export const transferStockSchema = z.object({
    sourceWarehouseId: z.number().int().positive('Source Warehouse ID must be a positive integer'),
    targetWarehouseId: z.number().int().positive('Target Warehouse ID must be a positive integer'),
    createdByUserId: z.number().int().positive('User ID must be a positive integer').optional(),
    notes: z.string().optional(),
    items: z.array(transferItemSchema).min(1, 'At least one item is required to transfer')
}).refine(data => data.sourceWarehouseId !== data.targetWarehouseId, {
    message: 'Source warehouse and target warehouse cannot be the same',
    path: ['targetWarehouseId']
});
