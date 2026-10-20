// File: src/services/inventoryService.ts
import prisma from '../config/prisma';

export const getAllInventory = async () => {
    return await prisma.inventory.findMany({
        include: {
            product: true,
            warehouse: true,
        },
    });
};

export const getWarehouseDashboardReport = async (warehouseId: number) => {

    // ==========================================
    // 1. CALCULATE TOTAL ITEMS (Using JS reduce)
    // ==========================================
    // First, fetch ALL stock rows in this warehouse
    const allStocks = await prisma.inventory.findMany({
        where: { warehouseId: Number(warehouseId) },
    });

    // TASK 1: Use reduce() to sum up all 'currentQty' from 'allStocks'
    // Clue: See the reduce example in Table 3
    const totalItemsInWarehouse = allStocks.reduce((total, item) => total + item.currentQty, 0);


    // ==========================================
    // 2. FIND CRITICAL STOCKS (Using Prisma lt)
    // ==========================================
    // TASK 2: Find inventory data in this warehouse where currentQty is LESS THAN 10
    // Clue: See the 'lt' example in Table 2
    const criticalStocks = await prisma.inventory.findMany({
        where: {
            warehouseId: Number(warehouseId),
            currentQty: {
                lt: 10
            }
        },
        include: { product: true } // This allows us to get the product name
    });


    // ==========================================
    // 3. FORMAT DATA FOR MANAGER (Using JS map)
    // ==========================================
    // The data from the database is very long (contains createdAt, updatedAt, etc.).
    // The Manager only needs 2 things: Product Name & Remaining Stock.

    // TASK 3: Use map() to transform the criticalStocks array
    // Clue: Return a new object that only contains 'itemName' and 'remainingStock'
    const formattedCriticalStocks = criticalStocks.map((item) => {
        return {
            itemName: item.product.name,
            remainingStock: item.currentQty,
            productId: item.productId,
            status: "RESTOCK IMMEDIATELY"
        };
    });


    // Finally, return the report
    return {
        totalItemsInWarehouse: totalItemsInWarehouse,
        criticalStockWarning: formattedCriticalStocks
    };
};