import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ==========================================
// 1. GET ALL WAREHOUSES (READ - PAGINATED & SEARCHABLE)
// ==========================================
export const getAllWarehouses = async (query: { page?: number; limit?: number; search?: string } = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { location: { contains: query.search, mode: 'insensitive' } }
        ];
    }

    const [warehouses, total] = await Promise.all([
        prisma.warehouse.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' }
        }),
        prisma.warehouse.count({ where })
    ]);

    return {
        data: warehouses,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// ==========================================
// 2. GET SINGLE WAREHOUSE BY ID (READ)
// ==========================================
export const getWarehouseById = async (id: number) => {
    const warehouse = await prisma.warehouse.findUnique({
        where: { id: Number(id) }
    });

    if (!warehouse) {
        throw new AppError(`Warehouse with ID ${id} not found.`, 404);
    }

    return warehouse;
};

// ==========================================
// 3. CREATE NEW WAREHOUSE (CREATE)
// ==========================================
export const createWarehouse = async (name: string, location: string) => {
    return await prisma.warehouse.create({
        data: {
            name,
            location
        }
    });
};

// ==========================================
// 4. UPDATE WAREHOUSE (UPDATE)
// ==========================================
export const updateWarehouse = async (id: number, data: { name?: string; location?: string }) => {
    await getWarehouseById(id);

    return await prisma.warehouse.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            location: data.location
        }
    });
};

// ==========================================
// 5. DELETE WAREHOUSE
// ==========================================
export const deleteWarehouse = async (id: number) => {
    await getWarehouseById(id);

    return await prisma.warehouse.delete({
        where: { id: Number(id) }
    });
};
