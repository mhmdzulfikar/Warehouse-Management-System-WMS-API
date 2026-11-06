import http from 'http';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const url = `http://${HOST}:${PORT}/api/benchmark/metrics`;

http.get(url, (res) => {
  let rawData = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    rawData += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(rawData);
      // Pretty print JSON with 2-space indentation
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      console.log(rawData);
    }
  });
}).on('error', (err) => {
  console.error(`\n❌ [Connection Error] Tidak dapat terhubung ke server di ${url}`);
  console.error(`💡 Pastikan server WMS sudah berjalan terlebih dahulu:`);
  console.error(`   Jalankan: npm run dev:all (atau npm run dev)\n`);
});

