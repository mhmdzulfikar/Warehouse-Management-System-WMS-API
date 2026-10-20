import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ==========================================
// 1. GET ALL PRODUCTS (READ - PAGINATED & SEARCHABLE)
// ==========================================
export const getAllProducts = async (query: { page?: number; limit?: number; search?: string } = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
        deletedAt: null
    };

    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } }
        ];
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' }
        }),
        prisma.product.count({ where })
    ]);

    return {
        data: products,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// ==========================================
// 2. GET SINGLE PRODUCT BY ID (READ)
// ==========================================
export const getProductById = async (id: number) => {
    const product = await prisma.product.findUnique({
        where: { id: Number(id) }
    });

    if (!product || product.deletedAt !== null) {
        throw new AppError(`Product with ID ${id} not found or has been deleted.`, 404);
    }

    return product;
};

// ==========================================
// 3. CREATE NEW PRODUCT (CREATE)
// ==========================================
export const createProduct = async (
    sku: string,
    name: string,
    uom: string,
    basePrice: number,
    minStock?: number
) => {
    const existingProduct = await prisma.product.findUnique({
        where: { sku: sku }
    });

    if (existingProduct) {
        throw new AppError(`SKU ${sku} is already in use by another product!`, 400);
    }

    return await prisma.product.create({
        data: {
            sku: sku,
            name: name,
            uom: uom,
            basePrice: basePrice,
            minStock: minStock !== undefined ? Number(minStock) : 10
        }
    });
};

// ==========================================
// 4. UPDATE PRODUCT (UPDATE)
// ==========================================
export const updateProduct = async (
    id: number,
    data: { name?: string; uom?: string; basePrice?: number; minStock?: number }
) => {
    await getProductById(id);

    return await prisma.product.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            uom: data.uom,
            basePrice: data.basePrice !== undefined ? Number(data.basePrice) : undefined,
            minStock: data.minStock !== undefined ? Number(data.minStock) : undefined
        }
    });
};

// ==========================================
// 5. DELETE PRODUCT (SOFT DELETE)
// ==========================================
export const deleteProduct = async (id: number) => {
    await getProductById(id);

    return await prisma.product.update({
        where: { id: Number(id) },
        data: {
            deletedAt: new Date()
        }
    });
};
