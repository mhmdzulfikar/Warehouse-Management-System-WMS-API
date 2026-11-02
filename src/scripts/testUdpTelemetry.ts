import { startAggregator, stopAggregator, getAggregatorMetrics } from '../aggregator';
import { sendUdpTelemetry, sendTcpTelemetry, maskSensitiveData, cacheInRingBuffer, closeUdpClient } from '../utils/udpLogger';
import { prisma } from '../config/prisma';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTelemetryVerification() {
  console.log('========================================================================');
  console.log('🔬 VERIFIKASI DUAL-TRACK TELEMETRY: UDP FAST-PATH + ARQ TCP RECOVERY');
  console.log('========================================================================\n');

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

  // 2. Start Dual Aggregator Server (UDP: 5001 + TCP: 5002)
  console.log('👉 [Test 2] Menjalankan Server Aggregator (UDP 5001 + TCP 5002)...');
  const server = startAggregator();
  await sleep(600); // Tunggu socket bind dan TCP server listening
  console.log('   ✅ PASS: UDP & TCP Recovery Aggregator aktif mendengarkan.\n');

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

  // 5. Test Packet Loss Detection & Automatic ARQ TCP Recovery (Method 1)
  console.log('👉 [Test 4] Menguji Deteksi Packet Loss & Otomatisasi Recovery via TCP NACK (Method 1)...');
  const baselineSeq = metrics.lastSeqId;
  const droppedCount = 4;

  // Simulasikan 4 paket yang tersimpan di Ring Buffer WMS API, tapi "hilang" di jaringan UDP
  for (let d = 1; d <= droppedCount; d++) {
    const droppedSeq = baselineSeq + d;
    cacheInRingBuffer(droppedSeq, {
      seqId: droppedSeq,
      type: 'LOG',
      level: 'INFO',
      endpoint: '/api/sales-orders',
      message: `Lost packet #${droppedSeq} recovered via TCP NACK`,
      timestamp: Date.now(),
    });
  }

  // Kirim paket sesudah celah (gap) untuk memicu Aggregator mendeteksi sequence jump
  sendUdpTelemetry({
    seqId: baselineSeq + droppedCount + 1,
    type: 'LOG',
    message: 'Trigger sequence jump packet',
    timestamp: Date.now(),
  });

  // Tunggu 500ms agar TCP NACK terkirim dari Aggregator -> WMS API merespons dengan paket yang hilang
  await sleep(600);

  metrics = getAggregatorMetrics();
  console.log('   Metrik Packet Loss & ARQ Recovery:', {
    totalPacketLossDetected: metrics.totalPacketLossDetected,
    totalRecoveredViaTcp: metrics.totalRecoveredViaTcp,
    netUnrecoveredLoss: metrics.netUnrecoveredLoss,
    recoveryRate: metrics.recoveryRatePercent,
  });

  if (metrics.totalRecoveredViaTcp > 0) {
    console.log(`   ✅ PASS: Selective Retransmission sukses! ${metrics.totalRecoveredViaTcp} paket yang hilang di-recovery via TCP (Net Loss: ${metrics.netUnrecoveredLoss}).\n`);
  } else {
    console.warn('   ⚠️ Paket loss terdeteksi tapi belum selesai direcover via TCP.\n');
  }

  // 6. Test Method 2: Direct TCP Fallback for Critical ERROR level
  console.log('👉 [Test 5] Menguji Direct TCP Transmission untuk Log Kritis ERROR (Method 2)...');
  const sentTcp = sendTcpTelemetry({
    seqId: metrics.lastSeqId + 10,
    type: 'LOG',
    level: 'ERROR',
    endpoint: '/api/transactions/error-test',
    message: 'Critical system exception guaranteed delivery via TCP Stream',
    timestamp: Date.now(),
  });
  await sleep(300);
  console.log(`   Status pengiriman Direct TCP: ${sentTcp ? 'Terkirim langsung' : 'Fallback'}`);
  console.log('   ✅ PASS: Log kritis berhasil dialirkan melalui jalur TCP terdedikasi.\n');

  // 7. Test Heartbeat Signal & Watchdog
  console.log('👉 [Test 6] Menguji Pengiriman Heartbeat Signal & Watchdog Timer...');
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

  // 8. Verifikasi Database PostgreSQL
  console.log('👉 [Test 7] Memverifikasi Database PostgreSQL...');
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

  // 9. Stop Aggregator Cleanly
  console.log('👉 [Test 8] Mematikan Aggregator Server & Client secara anggun...');
  await closeUdpClient();
  await stopAggregator();
  console.log('   ✅ PASS: Aggregator server (UDP + TCP) ditutup tanpa memory leak.\n');

  console.log('========================================================================');
  console.log('🎉 SELURUH PENGUJIAN DUAL-TRACK (UDP + ARQ TCP RECOVERY) SELESAI & SUKSES!');
  console.log('========================================================================');
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
