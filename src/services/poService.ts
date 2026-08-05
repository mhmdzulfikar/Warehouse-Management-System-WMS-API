import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// SERVICE 1: MEMBUAT PURCHASE ORDER BARU
// ==========================================
export const processCreatePO = async (supplierId: number, createdByUserId: number, items: any[]) => {
    // Variabel totalAmount ini hanya untuk merangkum total harga (tidak disimpan di database)
    let totalAmount = 0;
    
    // Looping 1: Menghitung estimasi total harga dari seluruh barang yang mau dibeli
    for (const item of items) {
        totalAmount += Number(item.qtyOrdered) * Number(item.unitPrice);
    }

    // Memulai Transaksi Database (tx). Kalau ada 1 yang gagal, otomatis di-rollback (dibatalkan semua)
    const newPo = await prisma.$transaction(async (tx) => {
        // Langkah 1: Buat 'Kertas Nota' (Header Purchase Order) dengan status masih PENDING
        const po = await tx.purchaseOrder.create({
            data: {
                supplierId: Number(supplierId),
                createdByUserId: Number(createdByUserId),
                status: 'PENDING',
            },
        });

        // Looping 2: Memasukkan daftar barang pesanan (items) ke dalam nota PO tadi
        for (const item of items) {
            // Membuat detail pesanan (poItem) dan menyambungkannya ke ID nota PO (po.id)
            await tx.poItem.create({
                data: {
                    poId: po.id, // Menyambungkan relasi
                    productId: Number(item.productId),
                    qty: Number(item.qtyOrdered),
                    expectedPrice: Number(item.unitPrice), // Harga satuan yang diharapkan
                },
            });
        }
        
        // Kembalikan data nota PO yang sudah berhasil dibuat
        return po;
    });

    // Menggabungkan (spread operator '...') data PO dengan totalAmount untuk dikirim ke layar pengguna
    return { ...newPo, totalAmount };
};

// ==========================================
// SERVICE 2: MENGAMBIL SEMUA DAFTAR PO
// ==========================================
export const fetchAllPOs = async () => {
    // Mengambil seluruh baris data dari tabel PurchaseOrder
    return await prisma.purchaseOrder.findMany({
        include: {
            supplier: true, // Sekalian ambil info supplier-nya
            poItems: {
                include: { product: true }, // Sekalian ambil nama produk di dalam detail PO
            },
        },
    });
};

// ==========================================
// SERVICE 3: MANAGER MENYETUJUI PO
// ==========================================
export const processApprovePO = async (id: number, approvedByUserId: number) => {
    // Langkah 1: Cek dulu apakah data PO-nya beneran ada di database
    const existingPo = await prisma.purchaseOrder.findUnique({
        where: { id: Number(id) },
    });

    // Validasi: Kalau nggak ada, langsung lemparkan error agar proses berhenti
    if (!existingPo) throw new Error(`Purchase Order dengan ID ${id} tidak ditemukan.`);
    
    // Validasi: Kalau statusnya bukan PENDING, berarti nggak bisa di-approve lagi
    if (existingPo.status !== 'PENDING') throw new Error(`PO ini tidak dapat disetujui karena statusnya sudah: ${existingPo.status}`);

    // Langkah 2: Update status PO menjadi APPROVED dan catat siapa manager yang menyetujui
    return await prisma.purchaseOrder.update({
        where: { id: Number(id) },
        data: {
            status: 'APPROVED',
            approvedByUserId: Number(approvedByUserId),
        },
    });
};

// ==========================================
// SERVICE 4: MENERIMA BARANG DARI PO
// ==========================================
export const processReceivePO = async (id: number, warehouseId: number, receivedByUserId: number) => {
    // Langkah 1: Cari data PO beserta daftar barang yang dipesannya (poItems)
    const po = await prisma.purchaseOrder.findUnique({
        where: { id: Number(id) },
        include: { poItems: true },
    });

    // Validasi
    if (!po) throw new Error(`Purchase Order dengan ID ${id} tidak ditemukan.`);
    if (po.status !== 'APPROVED') throw new Error(`PO ini tidak dapat diterima karena statusnya masih: ${po.status}. Harus APPROVED terlebih dahulu.`);

    // Transaksi Database dimulai: Agar masukin gudang & catat riwayat berjalan barengan
    return await prisma.$transaction(async (tx) => {
        // Langkah 2: Buat bukti/riwayat transaksi bahwa ada Barang Masuk (IN)
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                referenceType: 'PO', // Referensinya adalah dokumen PO
                referenceId: po.id,
                createdByUserId: Number(receivedByUserId),
            },
        });

        // Langkah 3: Perulangan (looping) untuk setiap barang yang dipesan dari PO tadi
        for (const item of po.poItems) {
            // A. Masukkan detail barang ini ke dalam riwayat transaksi (transactionItem)
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: item.productId,
                    warehouseId: Number(warehouseId),
                    qtyChange: item.qty, // Jumlah barang yang diterima (plus)
                },
            });

            // B. Cek apakah barang ini sudah pernah ada di gudang tersebut?
            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: Number(warehouseId),
                    },
                },
            });

            // C. Jika sudah ada, tinggal tambahkan saja jumlah stoknya (Update)
            if (existingInventory) {
                await tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: { currentQty: existingInventory.currentQty + item.qty },
                });
            } 
            // D. Jika belum ada, buat baris stok baru di gudang itu (Create)
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

        // Langkah 4: Ganti status Nota PO dari APPROVED menjadi RECEIVED (Selesai/Diterima)
        const updatedPo = await tx.purchaseOrder.update({
            where: { id: po.id },
            data: { status: 'RECEIVED' },
        });

        // Kembalikan dua-duanya (bukti transaksi & status PO terbaru)
        return { transaction, updatedPo };
    });
};