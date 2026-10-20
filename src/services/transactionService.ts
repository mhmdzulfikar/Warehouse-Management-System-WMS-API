import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ==========================================
// 1. GET ALL TRANSACTIONS (AUDIT LEDGER)
// ==========================================
export const getAllTransactions = async (query: { page?: number; limit?: number; type?: string }) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.type) {
        where.type = query.type.toUpperCase();
    }

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { timestamp: 'desc' },
            include: {
                createdBy: {
                    select: { id: true, username: true, email: true }
                },
                transactionItems: {
                    include: {
                        product: { select: { id: true, sku: true, name: true, uom: true } },
                        warehouse: { select: { id: true, name: true } }
                    }
                }
            }
        }),
        prisma.transaction.count({ where })
    ]);

    return {
        data: transactions,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// ==========================================
// 2. PROSES BARANG MASUK (IN)
// ==========================================
export const processTransactionIn = async (warehouseId: number, createdByUserId: number, items: any[]) => {
    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                referenceType: 'Manual',
                createdByUserId: Number(createdByUserId),
            },
        });

        for (const item of items) {
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    qtyChange: Number(item.qty),
                },
            });

            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            if (existingInventory) {
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: existingInventory.currentQty + Number(item.qty) },
                });
            } else {
                await tx.inventory.create({
                    data: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                        currentQty: Number(item.qty),
                    },
                });
            }
        }

        return transaction;
    });
};

// ==========================================
// 3. PROSES BARANG KELUAR (OUT)
// ==========================================
export const processTransactionOut = async (warehouseId: number, createdByUserId: number, items: any[]) => {
    return await prisma.$transaction(async (tx) => {
        for (const item of items) {
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            if (!inventory || inventory.currentQty < Number(item.qty)) {
                throw new AppError(`Stok tidak mencukupi untuk Product ID: ${item.productId}. Stok saat ini: ${inventory ? inventory.currentQty : 0}`, 400);
            }
        }

        const transaction = await tx.transaction.create({
            data: {
                type: 'OUT',
                referenceType: 'Manual',
                createdByUserId: Number(createdByUserId),
            },
        });

        for (const item of items) {
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    qtyChange: -Math.abs(Number(item.qty)),
                },
            });

            await tx.inventory.update({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
                data: {
                    currentQty: {
                        decrement: Number(item.qty),
                    },
                },
            });
        }

        return transaction;
    });
};

// ==========================================
// 4. PROSES PENYESUAIAN STOK (STOCK OPNAME / ADJUST)
// ==========================================
export const processTransactionAdjust = async (
    warehouseId: number,
    createdByUserId: number,
    items: { productId: number; actualQty: number; notes?: string }[],
    reason?: string
) => {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: Number(warehouseId) } });
    if (!warehouse) {
        throw new AppError(`Warehouse with ID ${warehouseId} not found`, 404);
    }

    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: {
                type: 'ADJUST',
                referenceType: reason || 'Stock Opname',
                createdByUserId: Number(createdByUserId),
            },
        });

        const adjustmentDetails = [];

        for (const item of items) {
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            const currentQty = existingInventory ? existingInventory.currentQty : 0;
            const qtyChange = Number(item.actualQty) - currentQty;

            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    qtyChange: qtyChange,
                },
            });

            if (existingInventory) {
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: Number(item.actualQty) },
                });
            } else {
                await tx.inventory.create({
                    data: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                        currentQty: Number(item.actualQty),
                    },
                });
            }

            adjustmentDetails.push({
                productId: item.productId,
                previousQty: currentQty,
                actualQty: item.actualQty,
                qtyChange: qtyChange,
                notes: item.notes
            });
        }

        return { transaction, adjustmentDetails };
    });
};

// ==========================================
// 5. PROSES TRANSFER ANTAR GUDANG (TRANSFER)
// ==========================================
export const processTransferStock = async (
    sourceWarehouseId: number,
    targetWarehouseId: number,
    createdByUserId: number,
    items: { productId: number; qty: number }[],
    notes?: string
) => {
    if (Number(sourceWarehouseId) === Number(targetWarehouseId)) {
        throw new AppError('Source warehouse and target warehouse cannot be the same', 400);
    }

    const [sourceWarehouse, targetWarehouse] = await Promise.all([
        prisma.warehouse.findUnique({ where: { id: Number(sourceWarehouseId) } }),
        prisma.warehouse.findUnique({ where: { id: Number(targetWarehouseId) } })
    ]);

    if (!sourceWarehouse) throw new AppError(`Source warehouse with ID ${sourceWarehouseId} not found`, 404);
    if (!targetWarehouse) throw new AppError(`Target warehouse with ID ${targetWarehouseId} not found`, 404);

    return await prisma.$transaction(async (tx) => {
        // Validate stock availability in source warehouse
        for (const item of items) {
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(sourceWarehouseId),
                    },
                },
            });

            if (!inventory || inventory.currentQty < Number(item.qty)) {
                throw new AppError(
                    `Insufficient stock in ${sourceWarehouse.name} for Product ID ${item.productId}. Available: ${inventory ? inventory.currentQty : 0}, requested: ${item.qty}`,
                    400
                );
            }
        }

        const transaction = await tx.transaction.create({
            data: {
                type: 'TRANSFER',
                referenceType: notes || `Transfer: ${sourceWarehouse.name} -> ${targetWarehouse.name}`,
                createdByUserId: Number(createdByUserId),
            },
        });

        for (const item of items) {
            const qty = Number(item.qty);

            // 1. Decrement source inventory & record negative change
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(sourceWarehouseId),
                    qtyChange: -qty,
                },
            });

            await tx.inventory.update({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(sourceWarehouseId),
                    },
                },
                data: {
                    currentQty: { decrement: qty },
                },
            });

            // 2. Increment target inventory & record positive change
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(targetWarehouseId),
                    qtyChange: qty,
                },
            });

            const targetInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(targetWarehouseId),
                    },
                },
            });

            if (targetInventory) {
                await tx.inventory.update({
                    where: { id: targetInventory.id },
                    data: { currentQty: { increment: qty } },
                });
            } else {
                await tx.inventory.create({
                    data: {
                        productId: Number(item.productId),
                        warehouseId: Number(targetWarehouseId),
                        currentQty: qty,
                    },
                });
            }
        }

        return transaction;
    });
};