import prisma from '../config/prisma';

export const getDashboardSummary = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalProducts,
        totalWarehouses,
        totalSuppliers,
        allInventories,
        pendingPos,
        partiallyReceivedPos,
        recentPos,
        recentTransactions,
        todayTransactionsCount,
        allWarehouses
    ] = await Promise.all([
        prisma.product.count({ where: { deletedAt: null } }),
        prisma.warehouse.count(),
        prisma.supplier.count({ where: { deletedAt: null } }),
        prisma.inventory.findMany({
            include: {
                product: {
                    select: { id: true, name: true, sku: true, basePrice: true, minStock: true, uom: true }
                },
                warehouse: {
                    select: { id: true, name: true, location: true }
                }
            }
        }),
        prisma.purchaseOrder.count({ where: { status: 'PENDING' } }),
        prisma.purchaseOrder.count({ where: { status: 'PARTIALLY_RECEIVED' } }),
        prisma.purchaseOrder.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: { select: { id: true, name: true } },
                createdBy: { select: { id: true, username: true } },
                poItems: { select: { id: true, qty: true, receivedQty: true, expectedPrice: true } }
            }
        }),
        prisma.transaction.findMany({
            take: 8,
            orderBy: { timestamp: 'desc' },
            include: {
                createdBy: { select: { id: true, username: true } },
                transactionItems: {
                    include: {
                        product: { select: { id: true, name: true, sku: true } },
                        warehouse: { select: { id: true, name: true } }
                    }
                }
            }
        }),
        prisma.transaction.count({
            where: { timestamp: { gte: today } }
        }),
        prisma.warehouse.findMany({
            include: {
                inventories: true
            }
        })
    ]);

    // Calculate total units & total asset value
    let totalStockUnits = 0;
    let totalStockValue = 0;
    const criticalStocks = [];

    for (const inv of allInventories) {
        totalStockUnits += inv.currentQty;
        const price = Number(inv.product.basePrice) || 0;
        totalStockValue += inv.currentQty * price;

        if (inv.currentQty <= inv.product.minStock) {
            criticalStocks.push({
                inventoryId: inv.id,
                productId: inv.product.id,
                productName: inv.product.name,
                sku: inv.product.sku,
                uom: inv.product.uom,
                warehouseId: inv.warehouse.id,
                warehouseName: inv.warehouse.name,
                currentQty: inv.currentQty,
                minStock: inv.product.minStock,
                shortage: Math.max(0, inv.product.minStock - inv.currentQty),
                status: inv.currentQty === 0 ? 'OUT_OF_STOCK' : 'CRITICAL_LOW'
            });
        }
    }

    // Warehouse stock distribution
    const warehouseDistribution = allWarehouses.map(wh => {
        const totalQty = wh.inventories.reduce((acc, curr) => acc + curr.currentQty, 0);
        return {
            id: wh.id,
            name: wh.name,
            totalItems: totalQty,
            uniqueProducts: wh.inventories.length
        };
    });

    // Transaction breakdown by type
    const txBreakdown = await prisma.transaction.groupBy({
        by: ['type'],
        _count: {
            id: true
        }
    });

    const transactionTypeCounts: Record<string, number> = {
        IN: 0,
        OUT: 0,
        ADJUST: 0,
        TRANSFER: 0
    };
    txBreakdown.forEach(item => {
        if (item.type in transactionTypeCounts) {
            transactionTypeCounts[item.type] = item._count.id;
        }
    });

    return {
        metrics: {
            totalProducts,
            totalWarehouses,
            totalSuppliers,
            totalStockUnits,
            totalStockValue: Math.round(totalStockValue),
            criticalStockCount: criticalStocks.length,
            pendingPoCount: pendingPos,
            partiallyReceivedPoCount: partiallyReceivedPos,
            todayTransactionsCount
        },
        warehouseDistribution,
        transactionTypeCounts,
        criticalStocks: criticalStocks.sort((a, b) => a.currentQty - b.currentQty).slice(0, 10),
        recentPurchaseOrders: recentPos.map(po => ({
            id: po.id,
            supplierName: po.supplier.name,
            createdByUser: po.createdBy.username,
            status: po.status,
            createdAt: po.createdAt,
            totalItemsCount: po.poItems.length,
            totalAmount: po.poItems.reduce((acc, it) => acc + (it.qty * Number(it.expectedPrice)), 0)
        })),
        recentTransactions: recentTransactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            referenceType: tx.referenceType,
            createdByUser: tx.createdBy.username,
            timestamp: tx.timestamp,
            itemCount: tx.transactionItems.length,
            items: tx.transactionItems.map(ti => ({
                productName: ti.product.name,
                warehouseName: ti.warehouse.name,
                qtyChange: ti.qtyChange
            }))
        }))
    };
};
