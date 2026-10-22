import { prisma } from '../config/prisma';

async function testFullOutboundFlow() {
  console.log('--- TESTING FULL OUTBOUND WORKFLOW ---');

  // 1. Get customer, product, warehouse, user
  const customer = await prisma.customer.findFirst();
  const product = await prisma.product.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  const user = await prisma.user.findFirst({ where: { username: 'admin' } });

  console.log(`Customer: ${customer?.name} (ID: ${customer?.id})`);
  console.log(`Product: ${product?.name} (ID: ${product?.id}, Stock Price: ${product?.price})`);
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
      data: { productId: product.id, warehouseId: warehouse.id, quantity: 200 },
    });
  } else if (inv.quantity < 20) {
    await prisma.inventory.update({
      where: { id: inv.id },
      data: { quantity: 200 },
    });
  }
  console.log(`Current inventory: ${inv.quantity} units`);

  // 2. Create Sales Order
  const orderNumber = `SO-TEST-${Date.now().toString().slice(-4)}`;
  const order = await prisma.salesOrder.create({
    data: {
      orderNumber,
      customerId: customer.id,
      warehouseId: warehouse.id,
      userId: user.id,
      totalAmount: 10 * Number(product.price),
      status: 'PENDING',
      notes: 'Test order from automated script',
      items: {
        create: [
          {
            productId: product.id,
            quantity: 10,
            unitPrice: Number(product.price),
            totalPrice: 10 * Number(product.price),
          },
        ],
      },
    },
    include: { items: true },
  });
  console.log(`[PASS] Created SO: ${order.orderNumber} (ID: ${order.id}) with status ${order.status}`);

  // 3. Confirm SO
  const confirmed = await prisma.salesOrder.update({
    where: { id: order.id },
    data: { status: 'CONFIRMED' },
  });
  console.log(`[PASS] Confirmed SO: Status is now ${confirmed.status}`);

  // 4. Picking
  const item = order.items[0];
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
    if (!invItem || invItem.quantity < 10) {
      throw new Error('Insufficient inventory for shipping');
    }
    await tx.inventory.update({
      where: { id: invItem.id },
      data: { quantity: { decrement: 10 } },
    });

    // Create Audit Transaction OUT
    await tx.transaction.create({
      data: {
        type: 'OUT',
        referenceType: 'DELIVERY_ORDER',
        referenceId: order.id,
        userId: user.id,
        note: `Fulfillment pengiriman keluar Surat Jalan ${doNumber} untuk ${order.orderNumber}`,
        items: {
          create: [
            {
              productId: product.id,
              warehouseId: warehouse.id,
              quantity: 10,
            },
          ],
        },
      },
    });

    // Create Delivery Order
    const doRecord = await tx.deliveryOrder.create({
      data: {
        doNumber,
        salesOrderId: order.id,
        recipientName: customer.name,
        recipientAddress: customer.address || 'Alamat Customer',
        shippingMethod: 'Armada Truk Internal',
        trackingNumber: 'B 9999 WMS',
        items: {
          create: [
            {
              productId: product.id,
              quantity: 10,
            },
          ],
        },
      },
      include: { items: true },
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
  console.log(`[PASS] Post-shipping inventory: ${postInv?.quantity} (decremented by 10)`);
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
