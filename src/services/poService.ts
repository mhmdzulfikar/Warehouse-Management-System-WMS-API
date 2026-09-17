import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// SERVICE 1: CREATE A NEW PURCHASE ORDER
// ==========================================
export const processCreatePO = async (supplierId: number, createdByUserId: number, items: any[]) => {
    // This totalAmount variable is only for summarizing the total price (not saved in the database)
    let totalAmount = 0;
    
    // Loop 1: Calculate the estimated total price of all items to be purchased
    for (const item of items) {
        totalAmount += Number(item.qtyOrdered) * Number(item.unitPrice);
    }

    // Start a Database Transaction (tx). If any step fails, it will automatically rollback (cancel everything)
    const newPo = await prisma.$transaction(async (tx) => {
        // Step 1: Create the 'Receipt Paper' (Purchase Order Header) with status still PENDING
        const po = await tx.purchaseOrder.create({
            data: {
                supplierId: Number(supplierId),
                createdByUserId: Number(createdByUserId),
                status: 'PENDING',
            },
        });

        // Loop 2: Insert the list of ordered items (items) into the PO receipt we just created
        for (const item of items) {
            // Create order detail (poItem) and connect it to the PO receipt ID (po.id)
            await tx.poItem.create({
                data: {
                    poId: po.id, // Connecting the relationship
                    productId: Number(item.productId),
                    qty: Number(item.qtyOrdered),
                    expectedPrice: Number(item.unitPrice), // Expected unit price
                },
            });
        }
        
        // Return the PO receipt data that was successfully created
        return po;
    });

    // Combine (spread operator '...') the PO data with totalAmount to be sent to the user interface
    return { ...newPo, totalAmount };
};

// ==========================================
// SERVICE 2: FETCH ALL PO LIST
// ==========================================
export const fetchAllPOs = async () => {
    // Fetch all rows of data from the PurchaseOrder table
    return await prisma.purchaseOrder.findMany({
        include: {
            supplier: true, // Also fetch its supplier info
            poItems: {
                include: { product: true }, // Also fetch the product name inside the PO details
            },
        },
    });
};

// ==========================================
// SERVICE 3: MANAGER APPROVES PO
// ==========================================
export const processApprovePO = async (id: number, approvedByUserId: number) => {
    // Step 1: First check if the PO data actually exists in the database
    const existingPo = await prisma.purchaseOrder.findUnique({
        where: { id: Number(id) },
    });

    // Validation: If it doesn't exist, immediately throw an error so the process stops
    if (!existingPo) throw new Error(`Purchase Order with ID ${id} not found.`);
    
    // Validation: If the status is not PENDING, it means it cannot be approved anymore
    if (existingPo.status !== 'PENDING') throw new Error(`This PO cannot be approved because its status is already: ${existingPo.status}`);

    // Step 2: Update PO status to APPROVED and record which manager approved it
    return await prisma.purchaseOrder.update({
        where: { id: Number(id) },
        data: {
            status: 'APPROVED',
            approvedByUserId: Number(approvedByUserId),
        },
    });
};

// ==========================================
// SERVICE 4: RECEIVE ITEMS FROM PO
// ==========================================
export const processReceivePO = async (id: number, warehouseId: number, receivedByUserId: number) => {
    // Step 1: Find the PO data along with the list of items it ordered (poItems)
    const po = await prisma.purchaseOrder.findUnique({
        where: { id: Number(id) },
        include: { poItems: true },
    });

    // Validation
    if (!po) throw new Error(`Purchase Order with ID ${id} not found.`);
    if (po.status !== 'APPROVED') throw new Error(`This PO cannot be received because its status is still: ${po.status}. It must be APPROVED first.`);

    // Database Transaction begins: So that putting items into the warehouse & recording history run together
    return await prisma.$transaction(async (tx) => {
        // Step 2: Create a transaction proof/history that there are Incoming Items (IN)
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                referenceType: 'PO', // The reference is the PO document
                referenceId: po.id,
                createdByUserId: Number(receivedByUserId),
            },
        });

        // Step 3: Loop for each item ordered from the PO earlier
        for (const item of po.poItems) {
            // A. Insert the detail of this item into the transaction history (transactionItem)
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: item.productId,
                    warehouseId: Number(warehouseId),
                    qtyChange: item.qty, // Number of items received (positive)
                },
            });

            // B. Check if this item has ever existed in that warehouse?
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            // C. If it already exists, just add the stock quantity (Update)
            if (existingInventory) {
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: existingInventory.currentQty + item.qty },
                });
            } 
            // D. If it doesn't exist yet, create a new stock row in that warehouse (Create)
            else {
                await tx.inventory.create({
                    data: {
                        productId: item.productId,
                        warehouseId: Number(warehouseId),
                        currentQty: item.qty,
                    },
                });
            }
        }

        // Step 4: Change PO Receipt status from APPROVED to RECEIVED (Done/Received)
        const updatedPo = await tx.purchaseOrder.update({
            where: { id: po.id },
            data: { status: 'RECEIVED' },
        });

        // Return both (transaction proof & latest PO status)
        return { transaction, updatedPo };
    });
};