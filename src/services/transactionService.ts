import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// SERVICE 1: PROCESS INCOMING ITEMS (IN)
// ==========================================
export const processTransactionIn = async (warehouseId: number, createdByUserId: number, items: any[]) => {
    // Start Database Transaction. 
    // All processes inside this block (record history & add stock) must all succeed.
    // If one fails (error), everything is automatically canceled (rollback).
    return await prisma.$transaction(async (tx) => {
        
        // Step 1: Create Transaction Proof Paper (Ledger)
        // This records that there is an "Incoming (IN)" activity "Manually".
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                referenceType: 'Manual',
                createdByUserId: Number(createdByUserId),
            },
        });

        // Step 2: Loop to process each item one by one
        for (const item of items) {
            
            // A. Record item details into the transaction proof paper
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id, // Connected to the transaction proof ID
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    qtyChange: Number(item.qty), // Because it's incoming, the value is positive (+)
                },
            });

            // B. Check if this product has ever been stored in that warehouse before
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            // C. Branching Logic (If-Else)
            if (existingInventory) {
                // If the item ALREADY EXISTS in the warehouse, we just UPDATE (add to) current stock
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: existingInventory.currentQty + Number(item.qty) },
                });
            } else {
                // If the item DOES NOT EXIST AT ALL, we CREATE a new stock row
                await tx.inventory.create({
                    data: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                        currentQty: Number(item.qty),
                    },
                });
            }
        }
        
        // Return the transaction proof that has been created
        return transaction;
    });
};

// ==========================================
// SERVICE 2: PROCESS OUTGOING ITEMS (OUT)
// ==========================================
export const processTransactionOut = async (warehouseId: number, createdByUserId: number, items: any[]) => {
    // Start Database Transaction.
    return await prisma.$transaction(async (tx) => {
        
        // Step 1: Stock Check (Validation)
        // Before items are issued, we must check if the stock is sufficient.
        for (const item of items) {
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            // If the item is not in the warehouse, OR the stock is less than what is to be issued,
            // then throw an Error. The process will immediately stop and cancel.
            if (!inventory || inventory.currentQty < Number(item.qty)) {
                throw new Error(`Insufficient stock for Product ID: ${item.productId}. Current stock: ${inventory ? inventory.currentQty : 0}`);
            }
        }

        // Step 2: Create Transaction Proof Paper (Ledger)
        // Record that there is an "Outgoing (OUT)" activity "Manually".
        const transaction = await tx.transaction.create({
            data: {
                type: 'OUT',
                referenceType: 'Manual',
                createdByUserId: Number(createdByUserId),
            },
        });

        // Step 3: Loop to record item issuance & deduct stock
        for (const item of items) {
            
            // A. Record item details into the transaction proof paper
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    // Make the value negative using -Math.abs()
                    // Example: if input is 10, recorded as -10. If input is -10, still recorded as -10.
                    qtyChange: -Math.abs(Number(item.qty)), 
                },
            });

            // B. Deduct the existing stock quantity in the warehouse
            await tx.inventory.update({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
                data: {
                    // Prisma has a 'decrement' function to automatically subtract numbers in the database
                    currentQty: {
                        decrement: Number(item.qty),
                    },
                },
            });
        }
        
        // Return the completed transaction proof
        return transaction;
    });
}; 