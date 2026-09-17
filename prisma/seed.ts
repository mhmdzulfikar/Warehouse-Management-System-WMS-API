import 'dotenv/config'; //  ini untuk membaca file .env
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'; // <-- Import adapter
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
    console.log('🌱 Sedang memasukkan data awal (seeding)...');

    // 1. Buat Roles
    const adminRole = await prisma.role.create({ data: { name: 'Admin' } });
    const staffGudangRole = await prisma.role.create({ data: { name: 'Staff Gudang' } });
    const purchasingRole = await prisma.role.create({ data: { name: 'Purchasing' } });
    const managerRole = await prisma.role.create({ data: { name: 'Manager' } });

    // 2. Buat Users berdasarkan Role
    const userManager = await prisma.user.create({
        data: { username: 'bapak_manager', email: 'manager@wms.com', roleId: managerRole.id },
    });
    const userPurchasing = await prisma.user.create({
        data: { username: 'andi_purchasing', email: 'purchasing@wms.com', roleId: purchasingRole.id },
    });
    const userGudang = await prisma.user.create({
        data: { username: 'joko_gudang', email: 'gudang@wms.com', roleId: staffGudangRole.id },
    });

    // 3. Buat Supplier
    const supplier1 = await prisma.supplier.create({
        data: { name: 'PT Sembako Jaya', contactInfo: '08123456789', address: 'Jl. Industri No. 10, Cikarang' },
    });

    // 3. Buat Supplier 2
    const supplier2 = await prisma.supplier.create({
        data: { name: 'PT Sembako Makmur', contactInfo: '08123456785', address: 'Jl. Industri No. 11, Cikarang' },
    });

    // 4. Buat Warehouse (Gudang Fisik)
    const warehouseUtama = await prisma.warehouse.create({
        data: { name: 'Gudang Pusat Cikarang', location: 'Kawasan Industri Jababeka' },
    });

    // 5. Buat Products
    const product1 = await prisma.product.create({
        data: { sku: 'MIE-GRG-01', name: 'Indomie Goreng', uom: 'dus', basePrice: 110000 },
    });
    const product2 = await prisma.product.create({
        data: { sku: 'MIA-KUD-02', name: 'Minyak Goreng 2L', uom: 'pcs', basePrice: 32000 },
    });
    const product3 = await prisma.product.create({
        data: { sku: 'MIA-KUD-03', name: 'Gula Pasir 1kg', uom: 'pcs', basePrice: 1000 },
    });

    // 6. Inisialisasi Inventory awal di Gudang Pusat
    await prisma.inventory.create({
        data: { productId: product1.id, warehouseId: warehouseUtama.id, currentQty: 50 },
    });
    await prisma.inventory.create({
        data: { productId: product2.id, warehouseId: warehouseUtama.id, currentQty: 20 },
    });

    console.log('✅ Data dummy berhasil dimasukkan ke PostgreSQL!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });