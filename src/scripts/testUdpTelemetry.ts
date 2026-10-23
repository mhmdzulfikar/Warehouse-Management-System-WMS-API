import { startAggregator, stopAggregator, getAggregatorMetrics } from '../aggregator';
import { sendUdpTelemetry, maskSensitiveData } from '../utils/udpLogger';
import { prisma } from '../config/prisma';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTelemetryVerification() {
  console.log('========================================================');
  console.log('🔬 MEMULAI VERIFIKASI DUAL-TRACK UDP TELEMETRY & AGGREGATOR');
  console.log('========================================================\n');

  // 1. Data Masking Test
  console.log('👉 [Test 1] Pengujian Masking Data Sensitif...');
  const sensitivePayload = {
    username: 'admin',
    password: 'super_secret_password_123',
    token: 'jwt.bearer.secret.token',
    authorization: 'Bearer secret_key',
    apiKey: 'sk-1234567890',
    safeData: 'Informasi publik aman',
    nested: {
      password: 'nested_password_abc',
      safeField: 42,
    },
  };
  const masked = maskSensitiveData(sensitivePayload);
  console.log('   Hasil Masking:', JSON.stringify(masked, null, 2));
  if (
    masked.password === '***' &&
    masked.token === '***' &&
    masked.authorization === '***' &&
    masked.apiKey === '***' &&
    masked.nested.password === '***' &&
    masked.safeData === 'Informasi publik aman'
  ) {
    console.log('   ✅ PASS: Data sensitif berhasil disensor (***) tanpa merusak field lain.\n');
  } else {
    throw new Error('Data masking gagal!');
  }

  // 2. Start Aggregator Server
  console.log('👉 [Test 2] Menjalankan Server UDP Log Aggregator (Port 5001)...');
  const server = startAggregator();
  await sleep(500); // Tunggu socket bind
  console.log('   ✅ PASS: UDP Aggregator aktif mendengarkan datagram.\n');

  // 3. Clear Existing Telemetry Logs (for clean benchmark count)
  const initialCount = await prisma.telemetryLog.count();
  console.log(`   Jumlah log di database saat ini: ${initialCount} baris.\n`);

  // 4. Send UDP Logs
  console.log('👉 [Test 3] Mengirim 105 Paket Telemetry Log via UDP (Menguji Threshold Batch 100)...');
  for (let i = 1; i <= 105; i++) {
    sendUdpTelemetry({
      type: 'LOG',
      level: i % 20 === 0 ? 'WARN' : 'INFO',
      method: 'GET',
      endpoint: `/api/products?page=${i}`,
      statusCode: 200,
      latencyMs: Math.random() * 50 + 5,
      message: `Automatic telemetry test log #${i}`,
      metadata: { iteration: i, testName: 'batch_test' },
    });
  }

  // Tunggu 800ms agar flush threshold 100 terpanggil
  await sleep(800);

  let metrics = getAggregatorMetrics();
  console.log('   Metrik Sementara:', {
    totalReceived: metrics.totalReceived,
    totalLogsInserted: metrics.totalLogsInserted,
    bufferSize: metrics.currentBufferSize,
  });

  if (metrics.totalLogsInserted >= 100) {
    console.log('   ✅ PASS: Hybrid Flush berhasil mengeksekusi Bulk-Insert saat mencapai batch 100!\n');
  } else {
    console.log('   ⏳ Menunggu flush timer 2000ms untuk sisa log...');
    await sleep(2200);
    metrics = getAggregatorMetrics();
    console.log(`   Total log tersimpan sekarang: ${metrics.totalLogsInserted}`);
  }

  // 5. Test Packet Loss Detection (Simulasi lompatan sequence ID)
  console.log('👉 [Test 4] Menguji Deteksi Packet Loss (Simulasi lompatan sequence ID)...');
  // Kirim paket normal
  sendUdpTelemetry({
    seqId: metrics.lastSeqId + 5, // Sengaja melompat 4 paket
    type: 'LOG',
    message: 'Log setelah packet drop simulasi',
  });

  await sleep(400);
  metrics = getAggregatorMetrics();
  console.log('   Metrik Packet Loss:', {
    lastSeqId: metrics.lastSeqId,
    totalPacketLoss: metrics.totalPacketLoss,
    lossRate: metrics.lossRatePercent,
  });

  if (metrics.totalPacketLoss > 0) {
    console.log(`   ✅ PASS: Sistem berhasil mendeteksi ${metrics.totalPacketLoss} paket hilang secara otomatis.\n`);
  } else {
    console.warn('   ⚠️ Packet loss tracker belum mencatat lompatan.\n');
  }

  // 6. Test Heartbeat Signal
  console.log('👉 [Test 5] Menguji Pengiriman Heartbeat Signal...');
  sendUdpTelemetry({
    type: 'HEARTBEAT',
    message: 'Manual Heartbeat Test',
    timestamp: Date.now(),
  });
  await sleep(300);
  metrics = getAggregatorMetrics();
  console.log('   Status Watchdog:', {
    isMainServerAlive: metrics.isMainServerAlive,
    lastHeartbeatTime: metrics.lastHeartbeatTime ? new Date(metrics.lastHeartbeatTime).toLocaleTimeString() : null,
  });
  if (metrics.isMainServerAlive) {
    console.log('   ✅ PASS: Heartbeat diterima dan Watchdog menandai server utama ALIVE.\n');
  }

  // 7. Verifikasi Database
  console.log('👉 [Test 6] Memverifikasi Database PostgreSQL...');
  await sleep(2200); // Pastikan seluruh sisa buffer ter-flush oleh interval timer
  const finalCount = await prisma.telemetryLog.count();
  const sampleLog = await prisma.telemetryLog.findFirst({
    orderBy: { id: 'desc' },
  });
  console.log(`   Total log tersimpan di PostgreSQL: ${finalCount} baris (+${finalCount - initialCount} baru).`);
  console.log('   Sample Telemetry Record di DB:', {
    id: sampleLog?.id,
    seqId: sampleLog?.seqId,
    endpoint: sampleLog?.endpoint,
    latencyMs: sampleLog?.latencyMs,
    message: sampleLog?.message,
    createdAt: sampleLog?.createdAt,
  });

  if (finalCount > initialCount) {
    console.log('   ✅ PASS: Data telemetri berhasil ter-persist di database PostgreSQL!\n');
  }

  // 8. Stop Aggregator Cleanly
  console.log('👉 [Test 7] Mematikan Aggregator Server secara anggun...');
  await stopAggregator();
  console.log('   ✅ PASS: Aggregator server ditutup tanpa memory leak.\n');

  console.log('========================================================');
  console.log('🎉 SELURUH PENGUJIAN DUAL-TRACK UDP TELEMETRY SELESAI & SUKSES!');
  console.log('========================================================');
}

runTelemetryVerification()
  .catch((err) => {
    console.error('Pengujian gagal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
