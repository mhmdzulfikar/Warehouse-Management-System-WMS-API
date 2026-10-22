import 'dotenv/config';
import { prisma, pool } from '../config/prisma';

async function main() {
  const count = await prisma.customer.count();
  if (count === 0) {
    await prisma.customer.createMany({
      data: [
        { code: 'CUST-001', name: 'Supermarket Bintang Jaya', contactInfo: '0811223344', address: 'Jl. Pemuda No. 88, Bekasi' },
        { code: 'CUST-002', name: 'Toko Kelontong Berkah Mandiri', contactInfo: '0855667788', address: 'Pasar Baru Blok A, Cikarang' },
        { code: 'CUST-003', name: 'Distributor Retail Sejahtera', contactInfo: '0877889900', address: 'Kawasan Niaga Kelapa Gading, Jakarta' },
      ],
    });
    console.log('✅ Berhasil memasukkan data awal Customer!');
  } else {
    console.log('Customer data count:', count);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
