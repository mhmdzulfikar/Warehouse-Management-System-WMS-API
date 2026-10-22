import { Request, Response } from 'express';
import {
  confirmSalesOrder,
  createSalesOrder,
  getDeliveryOrderById,
  getDeliveryOrders,
  getSalesOrderById,
  getSalesOrders,
  packSalesOrderItems,
  pickSalesOrderItems,
  shipSalesOrder,
} from '../services/salesOrderService';

export const getSalesOrdersHandler = async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  const orders = await getSalesOrders({ status, search });
  res.status(200).json({
    success: true,
    message: 'Daftar Sales Order berhasil diambil',
    data: orders,
  });
};

export const getSalesOrderByIdHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = await getSalesOrderById(id);

  res.status(200).json({
    success: true,
    message: 'Detail Sales Order berhasil diambil',
    data: order,
  });
};

export const createSalesOrderHandler = async (req: Request, res: Response) => {
  const userId = req.user?.userId || 1;
  const order = await createSalesOrder(userId, req.body);

  res.status(201).json({
    success: true,
    message: 'Sales Order baru berhasil diterbitkan',
    data: order,
  });
};

export const confirmSalesOrderHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = await confirmSalesOrder(id);

  res.status(200).json({
    success: true,
    message: 'Sales Order berhasil dikonfirmasi / approved',
    data: order,
  });
};

export const pickSalesOrderHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = await pickSalesOrderItems(id, req.body.items);

  res.status(200).json({
    success: true,
    message: 'Progres picking barang berhasil dicatat',
    data: order,
  });
};

export const packSalesOrderHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = await packSalesOrderItems(id, req.body.items);

  res.status(200).json({
    success: true,
    message: 'Progres packing barang berhasil dicatat',
    data: order,
  });
};

export const shipSalesOrderHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const userId = req.user?.userId || 1;
  const deliveryOrder = await shipSalesOrder(id, userId, req.body);

  res.status(200).json({
    success: true,
    message: 'Barang berhasil diberangkatkan & Surat Jalan (Delivery Order) telah terbit',
    data: deliveryOrder,
  });
};

export const getDeliveryOrdersHandler = async (req: Request, res: Response) => {
  const deliveryOrders = await getDeliveryOrders();

  res.status(200).json({
    success: true,
    message: 'Daftar Surat Jalan (Delivery Orders) berhasil dimuat',
    data: deliveryOrders,
  });
};

export const getDeliveryOrderByIdHandler = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const deliveryOrder = await getDeliveryOrderById(id);

  res.status(200).json({
    success: true,
    message: 'Detail Surat Jalan berhasil dimuat',
    data: deliveryOrder,
  });
};
