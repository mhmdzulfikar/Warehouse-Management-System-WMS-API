import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// SERVICE 1: PROSES BARANG MASUK (IN)
// ==========================================
export const processTransactionIn = async (warehouseId: number, createdByUserId: number, items: any[]) => {
    // Memulai Transaksi Database. 
    // Semua proses di dalam blok ini (catat riwayat & tambah stok) harus berhasil semua.
    // Jika ada satu yang gagal (error), maka semuanya otomatis dibatalkan (rollback).
    return await prisma.$transaction(async (tx) => {
        
        // Langkah 1: Buat Kertas Bukti Transaksi (Ledger)
        // Ini mencatat bahwa ada aktivitas "Masuk (IN)" secara "Manual".
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                referenceType: 'Manual',
                createdByUserId: Number(createdByUserId),
            },
        });

        // Langkah 2: Perulangan (Looping) untuk memproses setiap barang satu per satu
        for (const item of items) {
            
            // A. Mencatat detail barang ke dalam kertas bukti transaksi tadi
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id, // Disambungkan ke ID bukti transaksi
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    qtyChange: Number(item.qty), // Karena masuk, nilainya positif (+)
                },
            });

            // B. Mengecek apakah produk ini sudah pernah disimpan di gudang tersebut sebelumnya
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            // C. Logika Percabangan (If-Else)
            if (existingInventory) {
                // Jika barangnya SUDAH ADA di gudang, kita tinggal UPDATE (tambahkan) stok saat ini
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: existingInventory.currentQty + Number(item.qty) },
                });
            } else {
                // Jika barangnya BELUM ADA sama sekali, kita buat baris CREATE stok baru
                await tx.inventory.create({
                    data: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                        currentQty: Number(item.qty),
                    },
                });
            }
        }
        
        // Kembalikan bukti transaksi yang sudah selesai dibuat
        return transaction;
    });
};

// ==========================================
// SERVICE 2: PROSES BARANG KELUAR (OUT)
// ==========================================
export const processTransactionOut = async (warehouseId: number, createdByUserId: number, items: any[]) => {
    // Memulai Transaksi Database.
    return await prisma.$transaction(async (tx) => {
        
        // Langkah 1: Pengecekan Stok (Validasi)
        // Sebelum barang dikeluarkan, kita harus cek dulu apakah stoknya cukup.
        for (const item of items) {
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            // Jika barang tidak ada di gudang, ATAU stoknya lebih sedikit dari yang mau dikeluarkan, 
            // maka lemparkan Error. Proses akan langsung berhenti dan batal.
            if (!inventory || inventory.currentQty < Number(item.qty)) {
                throw new Error(`Stok tidak mencukupi untuk Product ID: ${item.productId}. Stok saat ini: ${inventory ? inventory.currentQty : 0}`);
            }
        }

        // Langkah 2: Buat Kertas Bukti Transaksi (Ledger)
        // Mencatat bahwa ada aktivitas "Keluar (OUT)" secara "Manual".
        const transaction = await tx.transaction.create({
            data: {
                type: 'OUT',
                referenceType: 'Manual',
                createdByUserId: Number(createdByUserId),
            },
        });

        // Langkah 3: Perulangan (Looping) untuk mencatat pengeluaran barang & mengurangi stok
        for (const item of items) {
            
            // A. Mencatat detail barang ke dalam kertas bukti transaksi
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: Number(item.productId),
                    warehouseId: Number(warehouseId),
                    // Mengubah nilai menjadi negatif menggunakan -Math.abs()
                    // Contoh: kalau input 10, dicatat -10. Kalau input -10, tetap dicatat -10.
                    qtyChange: -Math.abs(Number(item.qty)), 
                },
            });

            // B. Mengurangi jumlah stok yang ada di gudang
            await tx.inventory.update({
                where: {
                    productId_warehouseId: {
                        productId: Number(item.productId),
                        warehouseId: Number(warehouseId),
                    },
                },
                data: {
                    // Prisma punya fungsi 'decrement' untuk otomatis mengurangi angka di database
                    currentQty: {
                        decrement: Number(item.qty),
                    },
                },
            });
        }
        
        // Kembalikan bukti transaksi yang sudah selesai
        return transaction;
    });
}; 