import { z } from 'zod';

export const createProductSchema = z.object({
    sku: z.string().min(1, "SKU is required"),
    name: z.string().min(1, "Product name is required"),
    uom: z.string().min(1, "Unit of Measure (uom) is required"),
    basePrice: z.number().positive("Base Price must be greater than 0")
});

export const updateProductSchema = z.object({
    name: z.string().min(1, "Product name is required").optional(),
    uom: z.string().min(1, "Unit of Measure (uom) is required").optional(),
    basePrice: z.number().positive("Base Price must be greater than 0").optional()
});
