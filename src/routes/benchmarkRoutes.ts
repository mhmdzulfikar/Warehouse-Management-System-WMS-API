import { Router, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { prisma } from '../config/prisma';
import { sendUdpTelemetry, getLogsFromRingBuffer, getRingBufferStats } from '../utils/udpLogger';
import { getAggregatorMetrics, ingestDirectLog } from '../aggregator';

const router = Router();

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

export default router;
