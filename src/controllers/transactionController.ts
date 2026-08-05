import { Request, Response } from 'express';
// Kita import otaknya dari file Service yang baru kita buat
import { processTransactionIn, processTransactionOut } from '../services/transactionService';

export const createTransactionIn = async (req: Request, res: Response) => {
    try {
        const { warehouseId, createdByUserId, items } = req.body;

        if (!warehouseId || !createdByUserId || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap! Harap sertakan warehouseId, createdByUserId, dan items.',
            });
        }

        // PANGGIL SERVICE (Otaknya)
        const result = await processTransactionIn(Number(warehouseId), Number(createdByUserId), items);

        return res.status(201).json({
            success: true,
            message: 'Transaksi Barang Masuk (IN) berhasil dicatat dan stok gudang bertambah!',
            data: result,
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Gagal memproses transaksi barang masuk',
            error: error.message,
        });
    }
};

export const createTransactionOut = async (req: Request, res: Response) => {
    try {
        const { warehouseId, createdByUserId, items } = req.body;

        if (!warehouseId || !createdByUserId || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Data tidak lengkap! Harap sertakan warehouseId, createdByUserId, dan items.',
            });
        }

        // PANGGIL SERVICE (Otaknya)
        const result = await processTransactionOut(Number(warehouseId), Number(createdByUserId), items);

        return res.status(201).json({
            success: true,
            message: 'Transaksi Barang Keluar (OUT) berhasil dicatat dan stok gudang berkurang!',
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message, // Kalau stok kurang, tulisan error-nya dilempar ke sini
        });
    }
};