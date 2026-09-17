import { z } from 'zod';

export const createSupplierSchema = z.object({
    name: z.string().min(1, "Supplier name is required"),
    contactInfo: z.string().optional(),
    address: z.string().optional()
});

export const updateSupplierSchema = z.object({
    name: z.string().min(1, "Supplier name is required").optional(),
    contactInfo: z.string().optional(),
    address: z.string().optional()
});
