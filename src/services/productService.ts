import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// 1. GET ALL PRODUCTS (READ)
// ==========================================
export const getAllProducts = async () => {
    // Kita pakai `findMany` untuk ambil banyak data sekaligus.
    // Syaratnya: `deletedAt` harus null (berarti belum dihapus / Soft Delete).
    return await prisma.product.findMany({
        where: {
            deletedAt: null 
        }
    });
};

// ==========================================
// 2. GET SINGLE PRODUCT BY ID (READ)
// ==========================================
export const getProductById = async (id: number) => {
    // Pakai `findUnique` kalau cuma mau nyari 1 baris berdasarkan ID
    const product = await prisma.product.findUnique({
        where: { id: Number(id) }
    });

    // Kalau barang tidak ketemu atau sudah dihapus, lempar Error
    if (!product || product.deletedAt !== null) {
        throw new Error(`Product with ID ${id} not found or has been deleted.`);
    }

    return product;
};

// ==========================================
// 3. CREATE NEW PRODUCT (CREATE)
// ==========================================
export const createProduct = async (sku: string, name: string, uom: string, basePrice: number) => {
    // Cek dulu apakah SKU (Barcode) sudah dipakai?
    const existingProduct = await prisma.product.findUnique({
        where: { sku: sku }
    });

    if (existingProduct) {
        throw new Error(`SKU ${sku} is already in use by another product!`);
    }

    // Kalau aman, panggil `create` untuk masukin ke database
    return await prisma.product.create({
        data: {
            sku: sku,
            name: name,
            uom: uom,       // Unit of Measure (pcs, kg, box, etc.)
            basePrice: basePrice
        }
    });
};

// ==========================================
// 4. UPDATE PRODUCT (UPDATE)
// ==========================================
export const updateProduct = async (id: number, data: any) => {
    // Pastikan produknya ada dulu sebelum di-update
    await getProductById(id); // Kita pakai fungsi yang sudah dibuat di atas (nomor 2)

    // Kalau ada, lakukan update
    return await prisma.product.update({
        where: { id: Number(id) },
        data: {
            name: data.name,
            uom: data.uom,
            basePrice: data.basePrice
            // SKU biasanya tidak boleh diganti sembarangan, jadi kita abaikan
        }
    });
};

// ==========================================
// 5. DELETE PRODUCT (SOFT DELETE)
// ==========================================
export const deleteProduct = async (id: number) => {
    // Pastikan produknya ada
    await getProductById(id);

    // Daripada pakai `prisma.product.delete` (Hard Delete), 
    // kita pakai `update` lalu isi `deletedAt` dengan waktu sekarang (Soft Delete).
    // Kenapa? Supaya histori transaksi (Transaction Ledger) tidak error karena barangnya hilang.
    return await prisma.product.update({
        where: { id: Number(id) },
        data: {
            deletedAt: new Date()
        }
    });
};
