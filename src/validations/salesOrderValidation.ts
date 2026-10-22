import { z } from 'zod';

export const createSalesOrderSchema = z.object({
  customerId: z.number().int().positive('Customer ID harus bernilai positif'),
  warehouseId: z.number().int().positive('Warehouse ID harus bernilai positif'),
  deliveryDate: z.string().optional(),
  shippingAddress: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('Product ID harus bernilai positif'),
        quantity: z.number().int().positive('Jumlah kuantitas harus minimal 1'),
        price: z.number().nonnegative('Harga satuan tidak boleh negatif'),
      })
    )
    .min(1, 'Sales Order harus memiliki minimal 1 item barang'),
});

export const updatePickingSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        pickedQty: z.number().int().nonnegative(),
      })
    )
    .min(1, 'Minimal 1 item picking harus diinput'),
});

export const updatePackingSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        packedQty: z.number().int().nonnegative(),
      })
    )
    .min(1, 'Minimal 1 item packing harus diinput'),
});

export const shipSalesOrderSchema = z.object({
  driverName: z.string().optional(),
  vehiclePlate: z.string().optional(),
  recipientName: z.string().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive('Kuantitas kirim harus minimal 1'),
      })
    )
    .min(1, 'Minimal 1 item yang dikirim'),
});
