import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ==========================================
// SERVICE 1: CREATE A NEW PURCHASE ORDER
// ==========================================
export const processCreatePO = async (supplierId: number, createdByUserId: number, items: any[]) => {
    let totalAmount = 0;
    for (const item of items) {
        totalAmount += Number(item.qtyOrdered) * Number(item.unitPrice);
    }

    const newPo = await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.create({
            data: {
                supplierId: Number(supplierId),
                createdByUserId: Number(createdByUserId),
                status: 'PENDING',
            },
        });

        for (const item of items) {
            await tx.poItem.create({
                data: {
                    poId: po.id,
                    productId: Number(item.productId),
                    qty: Number(item.qtyOrdered),
                    expectedPrice: Number(item.unitPrice),
                },
            });
        }
        
        return po;
    });

    return { ...newPo, totalAmount };
};

// ==========================================
// SERVICE 2: FETCH ALL PO LIST (PAGINATED & FILTERABLE)
// ==========================================
export const fetchAllPOs = async (query: { page?: number; limit?: number; status?: string; supplierId?: number } = {}) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
        where.status = query.status.toUpperCase();
    }
    if (query.supplierId) {
        where.supplierId = Number(query.supplierId);
    }

    const [pos, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                supplier: true,
                createdBy: { select: { id: true, username: true, email: true } },
                approvedBy: { select: { id: true, username: true, email: true } },
                poItems: {
                    include: { product: true },
                },
            },
        }),
        prisma.purchaseOrder.count({ where })
    ]);

    return {
        data: pos,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

// ==========================================
// SERVICE 3: MANAGER APPROVES PO
// ==========================================
export const processApprovePO = async (id: number, approvedByUserId: number) => {
    const existingPo = await prisma.purchaseOrder.findUnique({
        where: { id: Number(id) },
    });

    if (!existingPo) throw new AppError(`Purchase Order with ID ${id} not found.`, 404);
    
    if (existingPo.status !== 'PENDING') {
        throw new AppError(`This PO cannot be approved because its status is already: ${existingPo.status}`, 400);
    }

    return await prisma.purchaseOrder.update({
        where: { id: Number(id) },
        data: {
            status: 'APPROVED',
            approvedByUserId: Number(approvedByUserId),
        },
    });
};

// ==========================================
// SERVICE 4: RECEIVE ITEMS FROM PO (SUPPORTS PARTIAL & FULL FULFILLMENT)
// ==========================================
export const processReceivePO = async (
    id: number,
    warehouseId: number,
    receivedByUserId: number,
    receivedItems?: { productId: number; qtyReceived: number }[]
) => {
    const po = await prisma.purchaseOrder.findUnique({
        where: { id: Number(id) },
        include: { poItems: true },
    });

    if (!po) throw new AppError(`Purchase Order with ID ${id} not found.`, 404);

    if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new AppError(
            `This PO cannot be received. Current status: ${po.status}. Must be APPROVED or PARTIALLY_RECEIVED.`,
            400
        );
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: Number(warehouseId) } });
    if (!warehouse) throw new AppError(`Warehouse with ID ${warehouseId} not found`, 404);

    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                referenceType: 'PO',
                referenceId: po.id,
                createdByUserId: Number(receivedByUserId),
            },
        });

        // Determine items to receive: either specified partially or receive all remaining
        const receiveMap = new Map<number, number>();
        if (receivedItems && receivedItems.length > 0) {
            for (const r of receivedItems) {
                receiveMap.set(Number(r.productId), Number(r.qtyReceived));
            }
        }

        for (const item of po.poItems) {
            const remainingToReceive = item.qty - item.receivedQty;
            let qtyToReceiveNow = 0;

            if (receiveMap.size > 0) {
                if (receiveMap.has(item.productId)) {
                    qtyToReceiveNow = receiveMap.get(item.productId)!;
                    if (qtyToReceiveNow > remainingToReceive) {
                        throw new AppError(
                            `Cannot receive ${qtyToReceiveNow} pcs for Product ID ${item.productId}. Only ${remainingToReceive} pcs remaining on this PO.`,
                            400
                        );
                    }
                }
            } else {
                // If no specific item array sent, receive all remaining unreceived quantity
                qtyToReceiveNow = remainingToReceive;
            }

            if (qtyToReceiveNow <= 0) continue;

            // 1. Update receivedQty on PoItem
            await tx.poItem.update({
                where: { id: item.id },
                data: { receivedQty: item.receivedQty + qtyToReceiveNow }
            });

            // 2. Record TransactionItem
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: item.productId,
                    warehouseId: Number(warehouseId),
                    qtyChange: qtyToReceiveNow,
                },
            });

            // 3. Update or create inventory in warehouse
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            if (existingInventory) {
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: existingInventory.currentQty + qtyToReceiveNow },
                });
            } else {
                await tx.inventory.create({
                    data: {
                        productId: item.productId,
                        warehouseId: Number(warehouseId),
                        currentQty: qtyToReceiveNow,
                    },
                });
            }
        }

        // Check overall PO completion status
        const refreshedPoItems = await tx.poItem.findMany({ where: { poId: po.id } });
        const allFullyReceived = refreshedPoItems.every(item => item.receivedQty >= item.qty);
        const newStatus = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

        const updatedPo = await tx.purchaseOrder.update({
            where: { id: po.id },
            data: { status: newStatus },
            include: { poItems: true }
        });

        return { transaction, updatedPo };
    });
};