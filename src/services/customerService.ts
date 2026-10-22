import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

export const getCustomers = async (search?: string) => {
  const where: any = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.customer.findMany({
    where,
    orderBy: { id: 'asc' },
  });
};

export const createCustomer = async (data: {
  code: string;
  name: string;
  contactInfo?: string;
  address?: string;
}) => {
  const existing = await prisma.customer.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new AppError(`Customer dengan kode ${data.code} sudah terdaftar`, 400);
  }

  return prisma.customer.create({
    data,
  });
};
