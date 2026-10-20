import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ==========================================
// 1. GET ALL SUPPLIERS (READ - PAGINATED & SEARCHABLE)
// ==========================================
export const getAllSuppliers = async (query: { page?: number; limit?: number; search?: string } = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
        deletedAt: null
    };

    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { address: { contains: query.search, mode: 'insensitive' } },
            { contactInfo: { contains: query.search, mode: 'insensitive' } }
        ];
    }

    const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' }
        }),
        prisma.supplier.count({ where })
    ]);

    return {
        data: suppliers,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// ==========================================
// 2. GET SINGLE SUPPLIER BY ID (READ)
// ==========================================
export const getSupplierById = async (id: number) => {
    const supplier = await prisma.supplier.findUnique({
        where: { id: Number(id) }
    });

    if (!supplier || supplier.deletedAt !== null) {
        throw new AppError(`Supplier with ID ${id} not found or has been deleted.`, 404);
    }

    return supplier;
};

// ==========================================
// 3. CREATE NEW SUPPLIER (CREATE)
// ==========================================
export const createSupplier = async (name: string, contactInfo?: string, address?: string) => {
    return await prisma.supplier.create({
        data: {
            name,
            contactInfo,
            address
        }
    });
};

// ==========================================
// 4. UPDATE SUPPLIER (UPDATE)
// ==========================================
export const updateSupplier = async (id: number, data: { name?: string; contactInfo?: string; address?: string }) => {
    await getSupplierById(id);

    return await prisma.supplier.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            contactInfo: data.contactInfo,
            address: data.address
        }
    });
};

// ==========================================
// 5. DELETE SUPPLIER (SOFT DELETE)
// ==========================================
export const deleteSupplier = async (id: number) => {
    await getSupplierById(id);

    return await prisma.supplier.update({
        where: { id: Number(id) },
        data: {
            deletedAt: new Date()
        }
    });
};
