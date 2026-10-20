import { z } from 'zod';

export const poItemSchema = z.object({
    productId: z.number().int().positive('Product ID must be a positive integer'),
    qtyOrdered: z.number().int().positive('Quantity ordered must be greater than 0'),
    unitPrice: z.number().positive('Unit price must be greater than 0')
});

export const createPoSchema = z.object({
    supplierId: z.number().int().positive('Supplier ID must be a positive integer'),
    createdByUserId: z.number().int().positive('User ID must be a positive integer').optional(),
    items: z.array(poItemSchema).min(1, 'At least one item is required in the PO')
});

export const approvePoSchema = z.object({
    approvedByUserId: z.number().int().positive('Approver User ID must be a positive integer').optional()
});

export const receivePoItemSchema = z.object({
    productId: z.number().int().positive('Product ID must be a positive integer'),
    qtyReceived: z.number().int().positive('Received quantity must be greater than 0')
});

export const receivePoSchema = z.object({
    warehouseId: z.number().int().positive('Warehouse ID must be a positive integer'),
    receivedByUserId: z.number().int().positive('Receiver User ID must be a positive integer').optional(),
    items: z.array(receivePoItemSchema).optional() // If omitted, full remaining unreceived items are received
});
