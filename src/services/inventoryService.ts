// File: src/services/inventoryService.ts
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

export const getAllInventory = async (query: { page?: number; limit?: number; warehouseId?: number; productId?: number } = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.warehouseId) where.warehouseId = Number(query.warehouseId);
    if (query.productId) where.productId = Number(query.productId);

    const [inventories, total] = await Promise.all([
        prisma.inventory.findMany({
            where,
            skip,
            take: limit,
            include: {
                product: true,
                warehouse: true,
            },
        }),
        prisma.inventory.count({ where })
    ]);

    return {
        data: inventories,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

export const getWarehouseDashboardReport = async (warehouseId: number) => {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: Number(warehouseId) } });
    if (!warehouse) {
        throw new AppError(`Warehouse with ID ${warehouseId} not found`, 404);
    }

    // 1. Fetch all stock rows in this warehouse along with product metadata
    const allStocks = await prisma.inventory.findMany({
        where: { warehouseId: Number(warehouseId) },
        include: { product: true }
    });

    // 2. Total items sum
    const totalItemsInWarehouse = allStocks.reduce((total, item) => total + item.currentQty, 0);

    // 3. Dynamic critical stock alert: currentQty <= product.minStock
    const criticalStocks = allStocks.filter(item => item.currentQty <= item.product.minStock);

    const formattedCriticalStocks = criticalStocks.map((item) => {
        return {
            productId: item.productId,
            sku: item.product.sku,
            itemName: item.product.name,
            remainingStock: item.currentQty,
            minStockThreshold: item.product.minStock,
            shortage: Math.max(0, item.product.minStock - item.currentQty),
            status: item.currentQty === 0 ? 'OUT OF STOCK' : 'CRITICAL - RESTOCK RECOMMENDED'
        };
    });

    return {
        warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            location: warehouse.location
        },
        totalProductsTracked: allStocks.length,
        totalItemsInWarehouse: totalItemsInWarehouse,
        criticalStockCount: formattedCriticalStocks.length,
        criticalStockWarning: formattedCriticalStocks
    };
};