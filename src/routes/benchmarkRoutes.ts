import { Router, Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { prisma } from '../config/prisma';
import { sendUdpTelemetry, cacheInRingBuffer, getRingBufferStats } from '../utils/udpLogger';
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
 * Benchmark 3: Packet Loss & ARQ TCP Recovery Simulation
 * Simulates dropping packets by caching in Ring Buffer while skipping UDP broadcast,
 * then transmitting a subsequent packet to trigger the Aggregator's TCP NACK recovery.
 */
router.all('/simulate-loss', async (req: Request, res: Response) => {
  const dropCount = Math.max(1, Math.min(50, Number(req.body?.dropCount || req.query?.dropCount || 5)));
  const baseSeq = sendUdpTelemetry({
    message: 'Pre-loss baseline packet',
    level: 'INFO',
    endpoint: '/api/benchmark/simulate-loss',
  });

  // Deliberately simulate dropped packets: stored in Ring Buffer, but NOT sent over UDP
  const droppedIds: number[] = [];
  for (let i = 1; i <= dropCount; i++) {
    const droppedSeq = baseSeq + i;
    droppedIds.push(droppedSeq);
    cacheInRingBuffer(droppedSeq, {
      seqId: droppedSeq,
      type: 'LOG',
      level: 'WARN',
      message: `Simulated dropped packet #${droppedSeq} (Recovered via TCP NACK)`,
      timestamp: Date.now(),
      endpoint: '/api/benchmark/simulate-loss',
    });
  }

  // Send packet after the gap to trigger the Aggregator's sequence gap detection
  const triggerSeq = baseSeq + dropCount + 1;
  sendUdpTelemetry({
    seqId: triggerSeq,
    type: 'LOG',
    level: 'INFO',
    message: `Trigger packet #${triggerSeq} to alert Aggregator of gap`,
    timestamp: Date.now(),
    endpoint: '/api/benchmark/simulate-loss',
  });

  // Brief pause to allow NACK over TCP to complete
  await new Promise((resolve) => setTimeout(resolve, 500));
  const metrics = getAggregatorMetrics();

  res.json({
    status: 'ok',
    description: 'Packet drop simulated and ARQ TCP retransmission triggered',
    simulatedDropCount: dropCount,
    droppedSeqIds: droppedIds,
    triggerSeqId: triggerSeq,
    aggregatorMetrics: metrics,
  });
});

/**
 * Ring Buffer Status Inspection
 */
router.get('/ring-buffer', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    ringBuffer: getRingBufferStats(),
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
