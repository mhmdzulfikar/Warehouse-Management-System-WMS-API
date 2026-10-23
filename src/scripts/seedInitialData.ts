import 'dotenv/config';
import { prisma, pool } from '../config/prisma';
import bcrypt from 'bcryptjs';

export async function seedInitialData() {
    console.log('🌱 Checking database initial state...');

    const roleCount = await prisma.role.count();
    if (roleCount > 0) {
        console.log('ℹ️ Database already contains data. Skipping initial seeding.');
        return;
    }

    console.log('📦 Seeding initial roles, users, warehouses, and master data...');

    const defaultHashedPassword = await bcrypt.hash('password123', 10);

    // 1. Roles
    const adminRole = await prisma.role.create({ data: { name: 'Admin' } });
    const staffGudangRole = await prisma.role.create({ data: { name: 'Staff Gudang' } });
    const purchasingRole = await prisma.role.create({ data: { name: 'Purchasing' } });
    const managerRole = await prisma.role.create({ data: { name: 'Manager' } });

    // 2. Users
    await prisma.user.createMany({
        data: [
            { username: 'admin_master', email: 'admin@wms.com', password: defaultHashedPassword, roleId: adminRole.id },
            { username: 'bapak_manager', email: 'manager@wms.com', password: defaultHashedPassword, roleId: managerRole.id },
            { username: 'andi_purchasing', email: 'purchasing@wms.com', password: defaultHashedPassword, roleId: purchasingRole.id },
            { username: 'joko_gudang', email: 'gudang@wms.com', password: defaultHashedPassword, roleId: staffGudangRole.id },
        ],
    });

    // 3. Suppliers
    const supplier1 = await prisma.supplier.create({
        data: { name: 'PT Sembako Jaya', contactInfo: '08123456789', address: 'Jl. Industri No. 10, Cikarang' },
    });
    const supplier2 = await prisma.supplier.create({
        data: { name: 'PT Sembako Makmur', contactInfo: '08123456785', address: 'Jl. Industri No. 11, Cikarang' },
    });

    // 4. Warehouse
    const warehouseUtama = await prisma.warehouse.create({
        data: { name: 'Gudang Pusat Cikarang', location: 'Kawasan Industri Jababeka Blok C-12' },
    });
    const warehouseCabang = await prisma.warehouse.create({
        data: { name: 'Gudang Transit Surabaya', location: 'Rungkut Industri No. 45' },
    });

    // 5. Products
    const product1 = await prisma.product.create({
        data: { sku: 'MIE-GRG-01', name: 'Indomie Goreng Spesial', uom: 'dus', basePrice: 115000 },
    });
    const product2 = await prisma.product.create({
        data: { sku: 'MIA-KUD-02', name: 'Minyak Goreng Sawit 2L', uom: 'pcs', basePrice: 34000 },
    });
    const product3 = await prisma.product.create({
        data: { sku: 'GLA-PSR-03', name: 'Gula Pasir Kristal Putih 1kg', uom: 'pcs', basePrice: 16500 },
    });
    const product4 = await prisma.product.create({
        data: { sku: 'KOP-SST-04', name: 'Kopi Kapal Api Sachet 10x25g', uom: 'renceng', basePrice: 14000 },
    });

    // 6. Initial Inventory
    await prisma.inventory.createMany({
        data: [
            { productId: product1.id, warehouseId: warehouseUtama.id, currentQty: 250 },
            { productId: product2.id, warehouseId: warehouseUtama.id, currentQty: 180 },
            { productId: product3.id, warehouseId: warehouseUtama.id, currentQty: 400 },
            { productId: product4.id, warehouseId: warehouseUtama.id, currentQty: 150 },
            { productId: product1.id, warehouseId: warehouseCabang.id, currentQty: 80 },
        ],
    });

    // 7. Customers
    await prisma.customer.createMany({
        data: [
            { code: 'CUST-001', name: 'Supermarket Bintang Jaya', contactInfo: '0811223344', address: 'Jl. Pemuda No. 88, Bekasi' },
            { code: 'CUST-002', name: 'Toko Kelontong Berkah Mandiri', contactInfo: '0855667788', address: 'Pasar Baru Blok A, Cikarang' },
            { code: 'CUST-003', name: 'Distributor Retail Sejahtera', contactInfo: '0877889900', address: 'Kawasan Niaga Kelapa Gading, Jakarta' },
        ],
    });

    console.log('✅ Initial database seed completed successfully!');
}

async function run() {
    try {
        await seedInitialData();
    } catch (error) {
        console.error('❌ Error during database seeding:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

if (require.main === module) {
    run();
}
