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

    console.log('📦 Seeding Enterprise WMS Nexus initial roles, users, global facilities, and catalog...');

    const defaultHashedPassword = await bcrypt.hash('password123', 10);

    // 1. RBAC Roles
    const adminRole = await prisma.role.create({ data: { name: 'Admin' } });
    const managerRole = await prisma.role.create({ data: { name: 'Manager' } });
    const purchasingRole = await prisma.role.create({ data: { name: 'Purchasing' } });
    const staffGudangRole = await prisma.role.create({ data: { name: 'Staff Gudang' } });

    // 2. Multi-Persona Users (Enterprise & Compatibility accounts)
    await prisma.user.createMany({
        data: [
            // Enterprise Global Personas
            { username: 'sysadmin', email: 'admin@wms-nexus.io', password: defaultHashedPassword, roleId: adminRole.id },
            { username: 'ops_director', email: 'marcus.director@wms-nexus.io', password: defaultHashedPassword, roleId: managerRole.id },
            { username: 'inv_supervisor', email: 'elena.inventory@wms-nexus.io', password: defaultHashedPassword, roleId: purchasingRole.id },
            { username: 'logistics_lead', email: 'david.fulfillment@wms-nexus.io', password: defaultHashedPassword, roleId: staffGudangRole.id },
            // Backward-Compatibility Aliases
            { username: 'admin_master', email: 'admin@wms.com', password: defaultHashedPassword, roleId: adminRole.id },
            { username: 'bapak_manager', email: 'manager@wms.com', password: defaultHashedPassword, roleId: managerRole.id },
            { username: 'andi_purchasing', email: 'purchasing@wms.com', password: defaultHashedPassword, roleId: purchasingRole.id },
            { username: 'joko_gudang', email: 'gudang@wms.com', password: defaultHashedPassword, roleId: staffGudangRole.id },
        ],
    });

    // 3. Tier-1 Global Enterprise Suppliers
    const supplier1 = await prisma.supplier.create({
        data: {
            name: 'Apex Microelectronics & Robotics Corp',
            contactInfo: '+1-415-890-2300 | contact@apex-micro.io',
            address: '100 Innovation Way, Silicon Valley, CA 95134, USA',
        },
    });
    const supplier2 = await prisma.supplier.create({
        data: {
            name: 'BioVanguard Cold-Chain Pharmaceuticals Ltd',
            contactInfo: '+41-61-555-8200 | supply@biovanguard.ch',
            address: 'Grenzacherstrasse 124, 4070 Basel, Switzerland',
        },
    });
    const supplier3 = await prisma.supplier.create({
        data: {
            name: 'Continental Precision Dynamics GmbH',
            contactInfo: '+49-69-700-1100 | logistics@continental-precision.de',
            address: 'Vahrenwalder Str. 9, 30165 Hannover, Germany',
        },
    });
    const supplier4 = await prisma.supplier.create({
        data: {
            name: 'OmniCore Advanced Sensors & Optics',
            contactInfo: '+65-6800-4500 | orders@omnicore-sensors.sg',
            address: '8 Marina View, Asia Square Tower 1, Singapore 018960',
        },
    });

    // 4. Global Warehouse Logistics Facilities
    const whGlobalDC = await prisma.warehouse.create({
        data: {
            code: 'GLOBAL-DC-01',
            name: 'North America Inland Empire Distribution Center',
            location: '14200 Logistics Blvd, Ontario, CA 91761, USA',
            zoneType: 'General High-Bay & Automated Storage (ASRS)',
        },
    });
    const whApacHub = await prisma.warehouse.create({
        data: {
            code: 'APAC-HUB-02',
            name: 'Asia-Pacific Air Logistics & Cross-Dock Hub',
            location: 'Cargo Terminal 4, Changi Airport Logistics Park, Singapore 498701',
            zoneType: 'Air Logistics Gateway & High-Velocity Cross-Dock',
        },
    });
    const whEmeaVault = await prisma.warehouse.create({
        data: {
            code: 'EMEA-DC-03',
            name: 'European Central Freight & Cold-Chain Hub',
            location: 'CargoCity South, Building 550, 60549 Frankfurt am Main, Germany',
            zoneType: 'Cold-Chain, Cleanroom & High-Security Vault',
        },
    });

    // 5. Enterprise High-Tech & Industrial Catalog
    const product1 = await prisma.product.create({
        data: {
            sku: 'SKU-ELEC-SRV-90',
            barcode: '0849312004521',
            name: 'Enterprise Dual-Socket Blade Server Module 2U',
            category: 'Computing & Infrastructure',
            uom: 'unit',
            basePrice: 2450.00,
            minStock: 15,
            weightKg: 18.50,
            storageTemp: 'Ambient',
        },
    });
    const product2 = await prisma.product.create({
        data: {
            sku: 'SKU-LID-AUT-08',
            barcode: '0819238472910',
            name: 'Automotive Autonomous Solid-State LiDAR Sensor',
            category: 'Automotive & Robotics',
            uom: 'unit',
            basePrice: 890.00,
            minStock: 25,
            weightKg: 1.20,
            storageTemp: 'Ambient',
        },
    });
    const product3 = await prisma.product.create({
        data: {
            sku: 'SKU-ROB-ARM-50',
            barcode: '0612984102938',
            name: 'Precision 6-Axis Robotic Actuator Arm Motor',
            category: 'Industrial Automation',
            uom: 'unit',
            basePrice: 1650.00,
            minStock: 20,
            weightKg: 8.40,
            storageTemp: 'Ambient',
        },
    });
    const product4 = await prisma.product.create({
        data: {
            sku: 'SKU-COLD-BIO-04',
            barcode: '0712984719283',
            name: 'Clinical Diagnostics Reagent Kit (-20°C Cold-Chain)',
            category: 'Life Sciences & Pharma',
            uom: 'kit',
            basePrice: 420.00,
            minStock: 50,
            weightKg: 0.85,
            storageTemp: '-20°C Cold-Chain',
        },
    });
    const product5 = await prisma.product.create({
        data: {
            sku: 'SKU-BAT-LITH-48',
            barcode: '0923841103847',
            name: 'High-Density 48V Lithium-Iron Pallet Power Module',
            category: 'Energy & Power Storage',
            uom: 'unit',
            basePrice: 1280.00,
            minStock: 10,
            weightKg: 34.00,
            storageTemp: 'Hazmat / Secure',
        },
    });
    const product6 = await prisma.product.create({
        data: {
            sku: 'SKU-MED-GLV-NIT',
            barcode: '0735002100892',
            name: 'Medical-Grade Sterile Nitrile Cleanroom Gloves (Box/100)',
            category: 'Medical Supplies & PPE',
            uom: 'box',
            basePrice: 45.00,
            minStock: 100,
            weightKg: 0.60,
            storageTemp: 'Ambient',
        },
    });
    const product7 = await prisma.product.create({
        data: {
            sku: 'SKU-OPT-FIB-10G',
            barcode: '0856192830192',
            name: 'Industrial Armored 10Gbps Multi-Mode Fiber Optic Reel 500m',
            category: 'Telecom Infrastructure',
            uom: 'reel',
            basePrice: 320.00,
            minStock: 30,
            weightKg: 12.00,
            storageTemp: 'Ambient',
        },
    });
    const product8 = await prisma.product.create({
        data: {
            sku: 'SKU-HYD-VLV-PRE',
            barcode: '0948271039481',
            name: 'Heavy-Duty Proportional Hydraulic Control Valve',
            category: 'Hydraulics & Heavy Machinery',
            uom: 'unit',
            basePrice: 740.00,
            minStock: 15,
            weightKg: 6.20,
            storageTemp: 'Ambient',
        },
    });

    // 6. Global Multi-Facility Inventory with Location Bins & Traceability
    await prisma.inventory.createMany({
        data: [
            // North America Inland Empire DC
            { productId: product1.id, warehouseId: whGlobalDC.id, currentQty: 240, storageLocation: 'BLK-A01-R02-B04', batchNumber: 'LOT-2026-X88' },
            { productId: product2.id, warehouseId: whGlobalDC.id, currentQty: 180, storageLocation: 'PCK-B02-R01-B03', batchNumber: 'LOT-2026-L12' },
            { productId: product3.id, warehouseId: whGlobalDC.id, currentQty: 95, storageLocation: 'BLK-A03-R01-B02', batchNumber: 'LOT-2026-R44' },
            { productId: product5.id, warehouseId: whGlobalDC.id, currentQty: 60, storageLocation: 'HAZ-H01-R01-B01', batchNumber: 'LOT-2026-B19' },
            { productId: product6.id, warehouseId: whGlobalDC.id, currentQty: 850, storageLocation: 'PCK-B01-R03-B01', batchNumber: 'LOT-2026-M09' },
            { productId: product7.id, warehouseId: whGlobalDC.id, currentQty: 140, storageLocation: 'BLK-C02-R02-B01', batchNumber: 'LOT-2026-F22' },
            { productId: product8.id, warehouseId: whGlobalDC.id, currentQty: 75, storageLocation: 'BLK-D01-R01-B02', batchNumber: 'LOT-2026-H30' },

            // Asia-Pacific Air Logistics Hub
            { productId: product1.id, warehouseId: whApacHub.id, currentQty: 110, storageLocation: 'BLK-A01-R01-B02', batchNumber: 'LOT-2026-X89' },
            { productId: product2.id, warehouseId: whApacHub.id, currentQty: 145, storageLocation: 'PCK-B01-R02-B01', batchNumber: 'LOT-2026-L14' },
            { productId: product4.id, warehouseId: whApacHub.id, currentQty: 220, storageLocation: 'CLD-Z01-R01-B01', batchNumber: 'LOT-2026-C04', expiryDate: new Date('2027-12-31') },
            { productId: product7.id, warehouseId: whApacHub.id, currentQty: 90, storageLocation: 'BLK-C01-R01-B03', batchNumber: 'LOT-2026-F25' },

            // European Central Freight & Cold-Chain Hub
            { productId: product3.id, warehouseId: whEmeaVault.id, currentQty: 70, storageLocation: 'BLK-B02-R01-B01', batchNumber: 'LOT-2026-R47' },
            { productId: product4.id, warehouseId: whEmeaVault.id, currentQty: 380, storageLocation: 'CLD-Z02-R01-B04', batchNumber: 'LOT-2026-C08', expiryDate: new Date('2028-06-30') },
            { productId: product6.id, warehouseId: whEmeaVault.id, currentQty: 620, storageLocation: 'PCK-A02-R02-B02', batchNumber: 'LOT-2026-M15' },
            { productId: product8.id, warehouseId: whEmeaVault.id, currentQty: 55, storageLocation: 'BLK-D02-R01-B01', batchNumber: 'LOT-2026-H35' },
        ],
    });

    // 7. Fortune-Scale B2B Customers
    await prisma.customer.createMany({
        data: [
            {
                code: 'CUST-GLB-001',
                name: 'OmniGlobal Retail Fulfillment Network (US-West)',
                contactInfo: '+1-800-450-9900 | orders@omniglobal.com',
                address: '4500 Fulfillment Parkway, Ontario, CA 91761, USA',
            },
            {
                code: 'CUST-GLB-002',
                name: 'AeroSpace Dynamics & Defense Logistics',
                contactInfo: '+1-206-555-0199 | procurement@aerospacedyn.com',
                address: '800 Boeing Way, Industrial Zone 4, Seattle, WA 98108, USA',
            },
            {
                code: 'CUST-GLB-003',
                name: 'Nordic Life Sciences Health Systems GmbH',
                contactInfo: '+49-89-923-400 | supply@nordichealth.de',
                address: 'Biotech Park 14, 82152 Martinsried, Munich, Germany',
            },
            {
                code: 'CUST-GLB-004',
                name: 'Pacific Industrial Automation & Robotics Ltd',
                contactInfo: '+65-6712-3400 | ops@pacificrobotics.sg',
                address: '10 Tuas South Ave 8, Singapore 637612',
            },
        ],
    });

    console.log('✅ Enterprise WMS Nexus initial database seed completed successfully!');
}

async function run() {
    try {
        await seedInitialData();
    } catch (error) {
        console.error('❌ Error during enterprise database seeding:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

if (require.main === module) {
    run();
}
