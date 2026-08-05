// File: src/services/inventoryService.ts
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const getWarehouseDashboardReport = async (warehouseId: number) => {

    // ==========================================
    // 1. NGITUNG TOTAL BARANG (Pake JS reduce)
    // ==========================================
    // Ambil dulu SEMUA baris stok di gudang ini
    const allStocks = await prisma.inventory.findMany({
        where: { warehouseId: Number(warehouseId) },
    });

    // TUGAS 1: Gunakan reduce() untuk menjumlahkan semua 'currentQty' dari 'allStocks'
    // Clue: Lihat contoh reduce di Tabel 3
    const totalItemsInWarehouse = allStocks.reduce((total, item) => total + item.currentQty, 0);


    // ==========================================
    // 2. NYARI STOK KRITIS (Pake Prisma lt)
    // ==========================================
    // TUGAS 2: Cari data inventory di gudang ini yang currentQty-nya KURANG DARI 10
    // Clue: Lihat contoh 'lt' di Tabel 2
    const criticalStocks = await prisma.inventory.findMany({
        where: {
            warehouseId: Number(warehouseId),
            currentQty: {
                lt: 10
            }
        },
        include: { product: true } // Ini biar kita bisa dapet nama produknya
    });


    // ==========================================
    // 3. NGERAPIHIN DATA BUAT MANAJER (Pake JS map)
    // ==========================================
    // Data dari database kan panjang banget (ada createdAt, updatedAt, dll).
    // Manajer cuma butuh 2 hal: Nama Produk & Sisa Stok.

    // TUGAS 3: Gunakan map() untuk merombak array criticalStocks
    // Clue: Return object baru yang isinya cuma 'nama' dan 'sisa'
    const formattedCriticalStocks = criticalStocks.map((item) => {
        return {
            namaBarang: item.product.name,
            sisaStok: item.currentQty,
            produkId: item.productId
        };
    });


    // Terakhir, kembalikan laporannya
    return {
        totalBarangDiGudang: totalItemsInWarehouse,
        peringatanStokKritis: formattedCriticalStocks
    };
};