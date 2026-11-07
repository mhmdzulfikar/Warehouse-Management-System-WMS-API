import { Router, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import autocannon from 'autocannon';
import { prisma } from '../config/prisma';
import { sendUdpTelemetry, getLogsFromRingBuffer, getRingBufferStats } from '../utils/udpLogger';
import { getAggregatorMetrics, ingestDirectLog } from '../aggregator';

const router = Router();

const isStudioEnabled = () => process.env.ENABLE_STUDIO !== 'false';
const isStressLabEnabled = () => process.env.ENABLE_STRESS_LAB !== 'false';

// Security Guard: Check if developer studio is enabled in current environment
router.use((_req: Request, res: Response, next) => {
  if (!isStudioEnabled()) {
    return res.status(404).json({ error: 'Developer Studio is disabled in this environment' });
  }
  next();
});

/**
 * Standard simulated CPU workload (same benchmark math workload as UDP-AGGREGATOR reference)
 */
function simulateWorkload(): number {
  let acc = 0;
  for (let i = 0; i < 10000; i++) {
    acc += Math.sqrt(i);
  }
  return acc;
}

/**
 * Benchmark 1: Synchronous Database Logging (Blocking Event Loop)
 * Simulates traditional architecture where every request awaits a direct DB INSERT over TCP
 */
router.get('/sync-log', async (req: Request, res: Response) => {
  const startTime = performance.now();
  simulateWorkload();
  const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

  try {
    const log = await prisma.telemetryLog.create({
      data: {
        seqId: 0,
        level: 'INFO',
        method: 'GET',
        endpoint: '/api/benchmark/sync-log',
        statusCode: 200,
        latencyMs,
        message: 'Synchronous blocking DB log write',
        metadata: { mode: 'SYNC_DATABASE', ip: req.ip },
      },
    });

    const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;
    res.json({
      status: 'ok',
      mode: 'SYNC_BLOCKING_DB',
      workloadLatencyMs: latencyMs,
      totalDurationMs: totalDuration,
      logId: log.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Benchmark 2: Dual-Track UDP Datagram Logging (Zero-Wait Fire-and-Forget)
 * Fires log packet asynchronously over local UDP socket without waiting for DB transaction
 */
router.get('/udp-log', (req: Request, res: Response) => {
  const startTime = performance.now();
  simulateWorkload();
  const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

  const seqId = sendUdpTelemetry({
    type: 'LOG',
    level: 'INFO',
    method: 'GET',
    endpoint: '/api/benchmark/udp-log',
    statusCode: 200,
    latencyMs,
    message: 'Zero-Wait fire-and-forget UDP telemetry log with ring-buffer & redundancy',
    metadata: { mode: 'UDP_ZERO_WAIT', ip: req.ip },
  });

  const totalDuration = Math.round((performance.now() - startTime) * 100) / 100;
  res.json({
    status: 'ok',
    mode: 'UDP_ZERO_WAIT',
    seqId,
    workloadLatencyMs: latencyMs,
    totalDurationMs: totalDuration,
  });
});

/**
 * INTERACTIVE TESTBED 1: Burst UDP Dispatcher
 * Fires 100, 1.000, or 5.000 UDP datagrams in a tight microsecond loop
 */
router.post('/burst-udp', (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.body.count || '1000', 10), 1), 10000);
  const start = performance.now();
  let lastSeq = 0;

  for (let i = 0; i < count; i++) {
    lastSeq = sendUdpTelemetry({
      type: 'LOG',
      level: i % 20 === 0 ? 'WARN' : 'INFO',
      method: 'POST',
      endpoint: '/api/benchmark/burst-udp',
      statusCode: 200,
      latencyMs: Math.round((Math.random() * 5 + 1) * 100) / 100,
      message: `Interactive Burst UDP Telemetry log #${i + 1}/${count}`,
      metadata: { burstIndex: i, testMode: 'BURST_UDP' },
    });
  }

  const durationMs = Math.round((performance.now() - start) * 100) / 100;
  const throughput = Math.round((count / (Math.max(durationMs, 1) / 1000)));

  res.json({
    status: 'ok',
    mode: 'BURST_UDP_DISPATCH',
    count,
    lastSeqId: lastSeq,
    durationMs,
    throughputPacketsPerSec: throughput,
    message: `Berhasil menembakkan ${count} paket UDP dalam ${durationMs}ms (${throughput.toLocaleString()} paket/detik)!`,
  });
});

/**
 * INTERACTIVE TESTBED 2: Synchronous DB Burst (Baseline Comparison)
 * Demonstrates slow blocking I/O when inserting logs directly to DB
 */
router.post('/burst-sync', async (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.body.count || '50', 10), 1), 200);
  const start = performance.now();

  try {
    for (let i = 0; i < count; i++) {
      await prisma.telemetryLog.create({
        data: {
          seqId: 0,
          level: 'INFO',
          method: 'POST',
          endpoint: '/api/benchmark/burst-sync',
          statusCode: 200,
          latencyMs: 15,
          message: `Synchronous Blocking DB Log #${i + 1}/${count}`,
          metadata: { mode: 'SYNC_BLOCKING_DB', iteration: i },
        },
      });
    }

    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const avgLatency = Math.round((durationMs / count) * 100) / 100;

    res.json({
      status: 'ok',
      mode: 'SYNC_BLOCKING_DB',
      count,
      durationMs,
      avgLatencyMsPerLog: avgLatency,
      message: `Selesai ${count} log sinkron DB dalam ${durationMs}ms (Rata-rata ${avgLatency}ms/log - lambat karena blocking I/O).`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * INTERACTIVE TESTBED 3: Simulated Packet Loss Injection
 * Deliberately jumps sequence ID to trigger Piggyback & NACK TCP Self-Healing
 */
router.post('/simulate-loss', (req: Request, res: Response) => {
  const jump = Math.min(Math.max(parseInt(req.body.jump || '5', 10), 2), 50);
  const ringStats = getRingBufferStats();
  const simulatedSeq = (ringStats.maxSeq || 100) + jump;

  sendUdpTelemetry({
    seqId: simulatedSeq,
    type: 'LOG',
    level: 'INFO',
    method: 'POST',
    endpoint: '/api/benchmark/simulate-loss',
    statusCode: 200,
    message: `Simulasi Paket Hilang: Sequence sengaja dilompati ${jump} paket ke #${simulatedSeq}!`,
    metadata: { jumpSimulated: jump, targetSeq: simulatedSeq },
  });

  res.json({
    status: 'ok',
    mode: 'PACKET_LOSS_SIMULATION',
    jumpCount: jump,
    simulatedSeqId: simulatedSeq,
    message: `Berhasil menembakkan paket dengan lompatan sequence +${jump}. Aggregator akan mendeteksi ${jump - 1} paket hilang dan mengaktifkan self-healing!`,
  });
});

/**
 * INTERACTIVE TESTBED 4: Critical Log Simulation (Method 2 TCP Fallback)
 */
router.post('/critical-fallback', (req: Request, res: Response) => {
  const seqId = sendUdpTelemetry({
    type: 'LOG',
    level: 'ERROR',
    statusCode: 500,
    method: 'POST',
    endpoint: '/api/benchmark/critical-fallback',
    message: 'Simulasi Log Kritis: Status 500 Server Error memicu Metode 2 (TCP Fallback Ingest)!',
    critical: true,
    metadata: { testMode: 'TCP_FALLBACK_CIRCUIT_BREAKER' },
  });

  res.json({
    status: 'ok',
    mode: 'METHOD_2_TCP_FALLBACK',
    seqId,
    message: 'Log level ERROR berhasil dikirim. Sistem otomatis mem-bypass UDP dan mengirimkan via TCP Fallback HTTP Ingest (Jaminan Anti-Hilang 100%)!',
  });
});

/**
 * INTERACTIVE TESTBED 5: Manual Heartbeat Signal Dispatcher
 */
router.post('/heartbeat', (_req: Request, res: Response) => {
  sendUdpTelemetry({
    type: 'HEARTBEAT',
    message: 'Manual Interactive Heartbeat Signal from Studio',
    timestamp: Date.now(),
  });

  res.json({
    status: 'ok',
    mode: 'HEARTBEAT_PING',
    timestamp: Date.now(),
    message: 'Sinyal Heartbeat berhasil ditembakkan ke Watchdog Aggregator!',
  });
});

/**
 * METHOD 1 ARQ ENDPOINT: NACK Selective Retransmission
 * The Aggregator calls this endpoint over TCP when sequence gap is detected
 * to retrieve missing packets from the sender's circular in-memory Ring Buffer.
 */
router.post('/telemetry-resend', (req: Request, res: Response) => {
  const { seqIds } = req.body;
  if (!Array.isArray(seqIds) || seqIds.length === 0) {
    return res.status(400).json({ success: false, message: 'seqIds array is required' });
  }

  const recoveredLogs = getLogsFromRingBuffer(seqIds);
  return res.json({
    success: true,
    requestedCount: seqIds.length,
    recoveredCount: recoveredLogs.length,
    recoveredLogs,
  });
});

/**
 * METHOD 2 FALLBACK ENDPOINT: TCP Telemetry Ingestion
 * For critical logs (e.g. 500 server error, critical inventory adjustments)
 * or when the UDP client encounters buffer backpressure.
 */
router.post('/telemetry-tcp-ingest', (req: Request, res: Response) => {
  const packet = req.body;
  if (!packet || typeof packet !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  ingestDirectLog(packet);
  return res.json({ success: true, mode: 'TCP_FALLBACK_INGESTED', seqId: packet.seqId });
});

/**
 * Ring Buffer Status Inspection
 */
router.get('/ring-buffer-stats', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    ringBuffer: getRingBufferStats(),
  });
});

/**
 * Purge / Clear All Accumulated Telemetry Logs from PostgreSQL Database
 * Useful to wipe out benchmark stress-test logs so the DB stays clean.
 */
router.delete('/logs', async (_req: Request, res: Response) => {
  try {
    const result = await prisma.telemetryLog.deleteMany({});
    res.json({
      status: 'ok',
      message: 'Semua log telemetri berhasil dibersihkan dari database.',
      deletedCount: result.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Benchmark Metrics: Live Telemetry, Self-Healing Packet Loss & System Statistics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    const totalLogsInDb = await prisma.telemetryLog.count();
    const aggregator = getAggregatorMetrics();

    res.json({
      status: 'ok',
      system: {
        nodeVersion: process.version,
        memoryRssMb: (memory.rss / (1024 * 1024)).toFixed(2),
        heapUsedMb: (memory.heapUsed / (1024 * 1024)).toFixed(2),
        cpuUserTicks: (cpu.user / 1000).toFixed(0),
        cpuSystemTicks: (cpu.system / 1000).toFixed(0),
      },
      database: {
        totalPersistedLogs: totalLogsInDb,
      },
      ringBuffer: getRingBufferStats(),
      aggregator,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * AUTOCANNON LOAD TESTER: Programmatic HTTP Benchmark Runner
 * Runs an official Autocannon load test directly on the server
 * and streams the result back as both structured JSON metrics
 * and a formatted ASCII terminal report table.
 */
let isAutocannonRunning = false;

router.post('/autocannon', async (req: Request, res: Response) => {
  if (!isStressLabEnabled()) {
    return res.status(403).json({
      error: 'Stress Lab testing is disabled by ENABLE_STRESS_LAB configuration.',
    });
  }

  if (isAutocannonRunning) {
    return res.status(429).json({
      error: 'Sesi pengujian beban Autocannon sedang berjalan. Harap tunggu hingga sesi sebelumnya selesai.',
    });
  }

  const target = req.body.target === 'sync' ? 'sync' : 'udp';
  const duration = Math.min(Math.max(parseInt(req.body.duration || '5', 10), 2), 30);
  const connections = Math.min(Math.max(parseInt(req.body.connections || '50', 10), 1), 200);
  const port = process.env.PORT || 5000;
  const targetUrl = `http://127.0.0.1:${port}/api/benchmark/${target === 'sync' ? 'sync-log' : 'udp-log'}`;

  isAutocannonRunning = true;
  try {
    const result = await autocannon({
      url: targetUrl,
      connections,
      duration,
      pipelining: 1,
    });

    const formattedTable = autocannon.printResult(result, { renderLatencyTable: true });

    res.json({
      status: 'ok',
      mode: 'AUTOCANNON_BENCHMARK',
      target,
      targetUrl,
      duration,
      connections,
      requestsTotal: result.requests.total,
      requestsAverage: Math.round(result.requests.average * 100) / 100,
      latencyAverageMs: Math.round(result.latency.average * 100) / 100,
      latencyP99Ms: Math.round(result.latency.p99 * 100) / 100,
      throughputAverageBytes: Math.round(result.throughput.average * 100) / 100,
      errors: result.errors,
      timeouts: result.timeouts,
      formattedTable,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menjalankan Autocannon' });
  } finally {
    isAutocannonRunning = false;
  }
});

export default router;
