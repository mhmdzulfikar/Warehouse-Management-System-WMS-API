import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getWarehouseDashboardReport } from '../services/inventoryService';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fungsi untuk mengambil semua data stok gudang beserta detail produknya
export const getInventoryStock = async (req: Request, res: Response) => {
    try {
        const inventories = await prisma.inventory.findMany({
            include: {
                product: true,
                warehouse: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Berhasil mengambil data stok gudang',
            data: inventories,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data',
            error: error.message,
        });
    }
};

export const getDashboardReport = async (req: Request, res: Response) => {
    try {
        // Karena ini URL-nya nanti misal: GET /api/inventory/report/1
        // Maka kita tangkap angka '1' (ID Gudang) dari parameternya
        const { warehouseId } = req.params;

        // Panggil si Koki (Service)
        const report = await getWarehouseDashboardReport(Number(warehouseId));

        // Balikin ke Manajer pakai bahasa yang rapi
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil laporan dashboard gudang",
            data: report
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil laporan',
            error: error.message
        });
    }
};