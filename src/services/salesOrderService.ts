import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

// 1. Get All Sales Orders
export const getSalesOrders = async (query: { status?: string; search?: string }) => {
  const where: any = {};
  if (query.status) {
    where.status = query.status.toUpperCase();
  }
  if (query.search) {
    where.OR = [
      { soNumber: { contains: query.search, mode: 'insensitive' } },
      { customer: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  return prisma.salesOrder.findMany({
    where,
    include: {
      customer: true,
      warehouse: true,
      createdBy: { select: { id: true, username: true } },
      soItems: {
        include: {
          product: true,
        },
      },
      deliveryOrders: true,
    },
    orderBy: { id: 'desc' },
  });
};

// 2. Get Sales Order by ID
export const getSalesOrderById = async (id: number) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      warehouse: true,
      createdBy: { select: { id: true, username: true } },
      soItems: {
        include: {
          product: true,
        },
      },
      deliveryOrders: {
        include: {
          doItems: {
            include: {
              product: true,
            },
          },
          dispatchedBy: { select: { id: true, username: true } },
        },
      },
    },
  });

  if (!order) {
    throw new AppError(`Sales Order dengan ID #${id} tidak ditemukan`, 404);
  }

  return order;
};

// 3. Create Sales Order
export const createSalesOrder = async (
  userId: number,
  data: {
    customerId: number;
    warehouseId: number;
    deliveryDate?: string;
    shippingAddress?: string;
    note?: string;
    items: Array<{ productId: number; quantity: number; price: number }>;
  }
) => {
  // Validate customer & warehouse
  const [customer, warehouse] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId, deletedAt: null } }),
    prisma.warehouse.findUnique({ where: { id: data.warehouseId } }),
  ]);

  if (!customer) throw new AppError('Customer tidak valid atau telah dihapus', 404);
  if (!warehouse) throw new AppError('Gudang fasilitas tidak valid', 404);

  // Auto generate SO number
  const count = await prisma.salesOrder.count();
  const year = new Date().getFullYear();
  const soNumber = `SO-${year}-${String(count + 1).padStart(4, '0')}`;

  const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return prisma.salesOrder.create({
    data: {
      soNumber,
      customerId: data.customerId,
      warehouseId: data.warehouseId,
      createdByUserId: userId,
      status: 'PENDING',
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      shippingAddress: data.shippingAddress || customer.address || 'Alamat Kantor Pelanggan',
      totalAmount,
      note: data.note,
      soItems: {
        create: data.items.map((item) => ({
          productId: item.productId,
          qty: item.quantity,
          unitPrice: item.price,
        })),
      },
    },
    include: {
      customer: true,
      warehouse: true,
      soItems: { include: { product: true } },
    },
  });
};

// 4. Confirm Sales Order (Manager or Purchasing approval)
export const confirmSalesOrder = async (soId: number) => {
  const so = await prisma.salesOrder.findUnique({ where: { id: soId } });
  if (!so) throw new AppError('Sales Order tidak ditemukan', 404);
  if (so.status !== 'PENDING') {
    throw new AppError(`Sales order sudah berada di status ${so.status}`, 400);
  }

  return prisma.salesOrder.update({
    where: { id: soId },
    data: { status: 'CONFIRMED' },
    include: { customer: true, soItems: { include: { product: true } } },
  });
};

// 5. Update Picking Progress
export const pickSalesOrderItems = async (
  soId: number,
  items: Array<{ productId: number; pickedQty: number }>
) => {
  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    include: { soItems: true },
  });
  if (!so) throw new AppError('Sales Order tidak ditemukan', 404);

  for (const it of items) {
    const existing = so.soItems.find((s) => s.productId === it.productId);
    if (!existing) continue;

    if (it.pickedQty > existing.qty) {
      throw new AppError(`Jumlah pick (${it.pickedQty}) melebihi kuantitas pesanan (${existing.qty})`, 400);
    }

    await prisma.soItem.update({
      where: { id: existing.id },
      data: { pickedQty: it.pickedQty },
    });
  }

  return prisma.salesOrder.update({
    where: { id: soId },
    data: { status: 'PICKING' },
    include: { soItems: { include: { product: true } } },
  });
};

// 6. Update Packing Progress
export const packSalesOrderItems = async (
  soId: number,
  items: Array<{ productId: number; packedQty: number }>
) => {
  const so = await prisma.salesOrder.findUnique({
    where: { id: soId },
    include: { soItems: true },
  });
  if (!so) throw new AppError('Sales Order tidak ditemukan', 404);

  for (const it of items) {
    const existing = so.soItems.find((s) => s.productId === it.productId);
    if (!existing) continue;

    if (it.packedQty > existing.qty) {
      throw new AppError(`Jumlah pack (${it.packedQty}) melebihi kuantitas pesanan (${existing.qty})`, 400);
    }

    await prisma.soItem.update({
      where: { id: existing.id },
      data: { packedQty: it.packedQty },
    });
  }

  return prisma.salesOrder.update({
    where: { id: soId },
    data: { status: 'PACKED' },
    include: { soItems: { include: { product: true } } },
  });
};

// 7. Dispatch & Ship Sales Order (Creates Delivery Order, deducts inventory, records OUT transaction)
export const shipSalesOrder = async (
  soId: number,
  userId: number,
  dispatchData: {
    driverName?: string;
    vehiclePlate?: string;
    recipientName?: string;
    note?: string;
    items: Array<{ productId: number; quantity: number }>;
  }
) => {
  return prisma.$transaction(async (tx) => {
    const so = await tx.salesOrder.findUnique({
      where: { id: soId },
      include: {
        soItems: { include: { product: true } },
        warehouse: true,
        customer: true,
      },
    });

    if (!so) throw new AppError('Sales Order tidak ditemukan', 404);
    if (so.status === 'CANCELLED') throw new AppError('Sales Order telah dibatalkan', 400);

    // Check stock availability in warehouse
    for (const item of dispatchData.items) {
      const soLine = so.soItems.find((s) => s.productId === item.productId);
      if (!soLine) {
        throw new AppError(`Produk ID #${item.productId} bukan bagian dari Sales Order ini`, 400);
      }

      const remainingToShip = soLine.qty - soLine.shippedQty;
      if (item.quantity > remainingToShip) {
        throw new AppError(
          `Kuantitas kirim (${item.quantity}) melebihi sisa pesanan (${remainingToShip}) untuk ${soLine.product.name}`,
          400
        );
      }

      const inv = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.productId,
            warehouseId: so.warehouseId,
          },
        },
      });

      if (!inv || inv.currentQty < item.quantity) {
        throw new AppError(
          `Stok fisik tidak mencukupi di ${so.warehouse.name} untuk produk ${soLine.product.name}. Saldo: ${
            inv?.currentQty || 0
          }, Diminta: ${item.quantity}`,
          400
        );
      }

      // 1. Potong saldo stok gudang
      await tx.inventory.update({
        where: { id: inv.id },
        data: { currentQty: inv.currentQty - item.quantity },
      });

      // 2. Update shippedQty pada SO Line
      await tx.soItem.update({
        where: { id: soLine.id },
        data: { shippedQty: soLine.shippedQty + item.quantity },
      });
    }

    // 3. Generate Surat Jalan (Delivery Order)
    const doCount = await tx.deliveryOrder.count();
    const year = new Date().getFullYear();
    const doNumber = `DO-${year}-${String(doCount + 1).padStart(4, '0')}`;

    const deliveryOrder = await tx.deliveryOrder.create({
      data: {
        doNumber,
        salesOrderId: so.id,
        warehouseId: so.warehouseId,
        dispatchedById: userId,
        status: 'SHIPPED',
        driverName: dispatchData.driverName || 'Kurir Logistik',
        vehiclePlate: dispatchData.vehiclePlate || '-',
        recipientName: dispatchData.recipientName || so.customer.name,
        note: dispatchData.note || `Pengiriman pesanan ${so.soNumber}`,
        doItems: {
          create: dispatchData.items.map((it) => ({
            productId: it.productId,
            qty: it.quantity,
          })),
        },
      },
      include: {
        doItems: { include: { product: true } },
      },
    });

    // 4. Catat transaksi OUT di Jurnal Mutasi Barang
    await tx.transaction.create({
      data: {
        type: 'OUT',
        referenceType: 'DELIVERY_ORDER',
        referenceId: deliveryOrder.id,
        createdByUserId: userId,
        transactionItems: {
          create: dispatchData.items.map((it) => ({
            productId: it.productId,
            warehouseId: so.warehouseId,
            qtyChange: -it.quantity, // Negatif karena pengeluaran barang
          })),
        },
      },
    });

    // 5. Evaluasi apakah SO sudah tuntas 100% terkirim
    const updatedLines = await tx.soItem.findMany({ where: { soId: so.id } });
    const isFullyShipped = updatedLines.every((l) => l.shippedQty >= l.qty);

    const finalStatus = isFullyShipped ? 'SHIPPED' : 'PARTIALLY_SHIPPED';
    await tx.salesOrder.update({
      where: { id: so.id },
      data: { status: finalStatus },
    });

    return deliveryOrder;
  });
};

// 8. Get Delivery Orders (Surat Jalan Keluar)
export const getDeliveryOrders = async () => {
  return prisma.deliveryOrder.findMany({
    include: {
      salesOrder: {
        include: {
          customer: true,
        },
      },
      warehouse: true,
      dispatchedBy: { select: { id: true, username: true } },
      doItems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { id: 'desc' },
  });
};

export const getDeliveryOrderById = async (id: number) => {
  const doDoc = await prisma.deliveryOrder.findUnique({
    where: { id },
    include: {
      salesOrder: {
        include: {
          customer: true,
        },
      },
      warehouse: true,
      dispatchedBy: { select: { id: true, username: true } },
      doItems: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!doDoc) throw new AppError('Dokumen Surat Jalan (Delivery Order) tidak ditemukan', 404);
  return doDoc;
};
