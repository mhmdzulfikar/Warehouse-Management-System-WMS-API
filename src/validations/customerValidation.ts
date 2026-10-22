import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z.string().min(2, 'Kode customer minimal 2 karakter').max(50),
  name: z.string().min(2, 'Nama customer minimal 2 karakter').max(150),
  contactInfo: z.string().optional(),
  address: z.string().optional(),
});
