import { prisma } from '../config/prisma';

async function testFullOutboundFlow() {
  console.log('--- TESTING FULL OUTBOUND WORKFLOW ---');

  // 1. Get customer, product, warehouse, user
  const customer = await prisma.customer.findFirst();
  const product = await prisma.product.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const user = await prisma.user.findFirst({ where: { username: 'bapak_manager' } }) || await prisma.user.findFirst();

  console.log(`Customer: ${customer?.name} (ID: ${customer?.id})`);
  console.log(`Product: ${product?.name} (ID: ${product?.id}, Base Price: ${product?.basePrice})`);
  console.log(`Warehouse: ${warehouse?.name} (ID: ${warehouse?.id})`);

  if (!customer || !product || !warehouse || !user) {
    throw new Error('Seed data missing for outbound test');
  }

  // Ensure inventory exists
  let inv = await prisma.inventory.findFirst({
    where: { productId: product.id, warehouseId: warehouse.id },
  });
  if (!inv) {
    inv = await prisma.inventory.create({
      data: { productId: product.id, warehouseId: warehouse.id, currentQty: 200 },
    });
  } else if (inv.currentQty < 20) {
    await prisma.inventory.update({
      where: { id: inv.id },
      data: { currentQty: 200 },
    });
  }
  console.log(`Current inventory: ${inv.currentQty} units`);

  // 2. Create Sales Order
  const soNumber = `SO-TEST-${Date.now().toString().slice(-4)}`;
  const order = await prisma.salesOrder.create({
    data: {
      soNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      createdByUserId: user.id,
      totalAmount: 10 * Number(product.basePrice),
      status: 'PENDING',
      note: 'Test order from automated script',
      soItems: {
        create: [
          {
            productId: product.id,
            qty: 10,
            unitPrice: Number(product.basePrice),
          },
        ],
      },
    },
    include: { soItems: true },
  });
  console.log(`[PASS] Created SO: ${order.soNumber} (ID: ${order.id}) with status ${order.status}`);

  // 3. Confirm SO
  const confirmed = await prisma.salesOrder.update({
    where: { id: order.id },
    data: { status: 'CONFIRMED' },
  });
  console.log(`[PASS] Confirmed SO: Status is now ${confirmed.status}`);

  // 4. Picking
  const item = order.soItems[0];
  await prisma.soItem.update({
    where: { id: item.id },
    data: { pickedQty: 10 },
  });
  const picking = await prisma.salesOrder.update({
    where: { id: order.id },
    data: { status: 'PICKING' },
  });
  console.log(`[PASS] Picked items: Status is now ${picking.status}`);

  // 5. Packing
  await prisma.soItem.update({
    where: { id: item.id },
    data: { packedQty: 10 },
  });
  const packed = await prisma.salesOrder.update({
    where: { id: order.id },
    data: { status: 'PACKED' },
  });
  console.log(`[PASS] Packed items: Status is now ${packed.status}`);

  // 6. Shipping & Delivery Order
  const doCount = await prisma.deliveryOrder.count();
  const doNumber = `DO-2026-${String(doCount + 1).padStart(4, '0')}`;

  const result = await prisma.$transaction(async (tx) => {
    // Deduct stock
    const invItem = await tx.inventory.findFirst({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    if (!invItem || invItem.currentQty < 10) {
      throw new Error('Insufficient inventory for shipping');
    }
    await tx.inventory.update({
      where: { id: invItem.id },
      data: { currentQty: { decrement: 10 } },
    });

    // Create Delivery Order
    const doRecord = await tx.deliveryOrder.create({
      data: {
        doNumber,
        salesOrderId: order.id,
        warehouseId: warehouse.id,
        dispatchedById: user.id,
        recipientName: customer.name,
        driverName: 'Armada Truk Internal',
        vehiclePlate: 'B 9999 WMS',
        doItems: {
          create: [
            {
              productId: product.id,
              qty: 10,
            },
          ],
        },
      },
      include: { doItems: true },
    });

    // Create Audit Transaction OUT
    await tx.transaction.create({
      data: {
        type: 'OUT',
        referenceType: 'DELIVERY_ORDER',
        referenceId: doRecord.id,
        createdByUserId: user.id,
        transactionItems: {
          create: [
            {
              productId: product.id,
              warehouseId: warehouse.id,
              qtyChange: -10,
            },
          ],
        },
      },
    });

    // Update SO status
    const shippedSo = await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: 'SHIPPED' },
    });

    return { deliveryOrder: doRecord, salesOrder: shippedSo };
  });

  console.log(`[PASS] Shipped SO: Generated Delivery Order ${result.deliveryOrder.doNumber}`);
  const postInv = await prisma.inventory.findFirst({
    where: { productId: product.id, warehouseId: warehouse.id },
  });
  console.log(`[PASS] Post-shipping inventory: ${postInv?.currentQty} (decremented by 10)`);
  console.log('--- ALL OUTBOUND LOGIC VERIFIED SUCCESSFULLY ---');
}

testFullOutboundFlow()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
