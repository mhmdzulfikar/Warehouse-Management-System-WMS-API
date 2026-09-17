import { z } from 'zod';

export const createWarehouseSchema = z.object({
    name: z.string().min(1, "Warehouse name is required"),
    location: z.string().min(1, "Location is required")
});

export const updateWarehouseSchema = z.object({
    name: z.string().min(1, "Warehouse name is required").optional(),
    location: z.string().min(1, "Location is required").optional()
});
