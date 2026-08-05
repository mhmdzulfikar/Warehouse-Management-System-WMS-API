import { Request, Response, NextFunction } from 'express';

// 1. Satpam Pengecek Login
export const checkIsLoggedIn = (req: Request, res: Response, next: NextFunction): void => {
    // Kita ibaratkan 'x-user-id' di header adalah KTP-nya
    const userId = req.headers['x-user-id'];

    if (!userId) {
        // Ngga bawa KTP? Tendang! (401 Unauthorized)
        res.status(401).json({
            success: false,
            message: 'Akses Ditolak: Anda belum login! (Tidak ada x-user-id di header)'
        });
        return;
    }

    // Kalau bawa KTP, silakan lanjut!
    next();
};

// 2. Satpam Pengecek Jabatan Khusus (Hanya Manajer)
export const checkIsManager = (req: Request, res: Response, next: NextFunction): void => {
    // Kita cek jabatannya dari header 'x-role'
    const role = req.headers['x-role'];

    if (role !== 'MANAGER') {
        // Bawa KTP tapi bukan Manajer? Tendang! (403 Forbidden)
        res.status(403).json({
            success: false,
            message: 'Akses Dilarang: Fitur ini hanya untuk MANAGER!'
        });
        return;
    }

    // Kalau jabatannya beneran MANAGER, silakan lanjut ke Controller!
    next();
};