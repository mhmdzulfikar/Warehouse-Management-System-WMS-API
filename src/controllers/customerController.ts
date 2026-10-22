import { Request, Response } from 'express';
import { createCustomer, getCustomers } from '../services/customerService';

export const getCustomersHandler = async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const customers = await getCustomers(search);

  res.status(200).json({
    success: true,
    message: 'Data customer berhasil dimuat',
    data: customers,
  });
};

export const createCustomerHandler = async (req: Request, res: Response) => {
  const customer = await createCustomer(req.body);

  res.status(201).json({
    success: true,
    message: 'Customer baru berhasil ditambahkan',
    data: customer,
  });
};
