import { Router, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { prisma } from '../config/prisma';
import { sendUdpTelemetry } from '../utils/udpLogger';
import { getAggregatorMetrics } from '../aggregator';

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
    message: 'Zero-Wait fire-and-forget UDP telemetry log',
    metadata: { mode: 'UDP_FIRE_AND_FORGET', ip: req.ip },
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
 * Benchmark Metrics: Live Telemetry & System Statistics
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
      aggregator,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
