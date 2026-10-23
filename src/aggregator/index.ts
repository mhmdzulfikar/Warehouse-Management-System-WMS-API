import dotenv from 'dotenv';
dotenv.config();

import dgram from 'dgram';
import { performance } from 'perf_hooks';
import { prisma } from '../config/prisma';
import type { TelemetryPayload } from '../utils/udpLogger';

// Configuration
const UDP_PORT = parseInt(process.env.UDP_PORT || '5001', 10);
const UDP_HOST = process.env.UDP_HOST || '0.0.0.0';

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER_LIMIT = 10000;
const WATCHDOG_THRESHOLD_MS = 15000; // 15 seconds threshold
const WATCHDOG_CHECK_INTERVAL_MS = 3000;

// State Variables
let logBuffer: TelemetryPayload[] = [];
let isFlushing = false;

// Metrics & Packet Loss Tracking
export interface AggregatorMetrics {
  totalReceived: number;
  totalLogsInserted: number;
  totalPacketLoss: number;
  lossRatePercent: string;
  lastSeqId: number;
  currentBufferSize: number;
  isMainServerAlive: boolean;
  lastHeartbeatTime: number | null;
  uptimeSeconds: number;
}

let totalReceivedCount = 0;
let totalLogsInserted = 0;
let totalPacketLossCount = 0;
let lastSequenceId = 0;
let lastHeartbeatTimestamp: number | null = null;
let isMainServerUnresponsive = false;
const startTime = Date.now();

export function getAggregatorMetrics(): AggregatorMetrics {
  const totalExpected = totalReceivedCount + totalPacketLossCount;
  const lossRate = totalExpected > 0
    ? ((totalPacketLossCount / totalExpected) * 100).toFixed(2)
    : '0.00';

  return {
    totalReceived: totalReceivedCount,
    totalLogsInserted,
    totalPacketLoss: totalPacketLossCount,
    lossRatePercent: `${lossRate}%`,
    lastSeqId: lastSequenceId,
    currentBufferSize: logBuffer.length,
    isMainServerAlive: !isMainServerUnresponsive && lastHeartbeatTimestamp !== null,
    lastHeartbeatTime: lastHeartbeatTimestamp,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
}

// -------------------------------------------------------------
// 1. Hybrid Flush & Double Buffering Mechanism
// -------------------------------------------------------------
export async function flushBuffer(): Promise<void> {
  if (isFlushing || logBuffer.length === 0) return;
  isFlushing = true;

  // Double Buffering: Instantly swap buffer array in RAM
  const recordsToInsert = logBuffer;
  logBuffer = [];

  try {
    const flushStart = performance.now();

    const data = recordsToInsert.map((item) => ({
      seqId: item.seqId || 0,
      level: item.level || 'INFO',
      method: item.method || null,
      endpoint: item.endpoint || null,
      statusCode: item.statusCode || null,
      latencyMs: item.latencyMs !== undefined ? item.latencyMs : null,
      userId: item.userId || null,
      message: item.message || 'Telemetry Log',
      metadata: item.metadata || undefined,
      createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
    }));

    // Bulk-Insert via Prisma
    const result = await prisma.telemetryLog.createMany({
      data,
      skipDuplicates: true,
    });

    totalLogsInserted += result.count;
    const durationMs = (performance.now() - flushStart).toFixed(2);
    console.log(
      `[Aggregator Flush] Bulk-insert ${result.count} logs sukses (${durationMs}ms). Buffer aktif: ${logBuffer.length}`
    );
  } catch (err: any) {
    console.error('[Aggregator Flush Error]', err.message);
  } finally {
    isFlushing = false;
  }
}

// -------------------------------------------------------------
// 2. Watchdog Timer Monitoring (15 Seconds Threshold)
// -------------------------------------------------------------
function startWatchdogTimer(): NodeJS.Timeout {
  return setInterval(() => {
    if (lastHeartbeatTimestamp === null) {
      // No initial heartbeat yet, waiting for main server start
      return;
    }

    const elapsedSinceHeartbeat = Date.now() - lastHeartbeatTimestamp;

    if (elapsedSinceHeartbeat > WATCHDOG_THRESHOLD_MS && !isMainServerUnresponsive) {
      isMainServerUnresponsive = true;
      console.warn(
        `🚨 [WATCHDOG ALERT] Sinyal Heartbeat dari server utama TERPUTUS! Tidak ada respon selama ${Math.round(
          elapsedSinceHeartbeat / 1000
        )} detik (>15s)!`
      );
    }
  }, WATCHDOG_CHECK_INTERVAL_MS);
}

// -------------------------------------------------------------
// 3. UDP Socket Server Setup
// -------------------------------------------------------------
export function createAggregatorServer(): dgram.Socket {
  const server = dgram.createSocket('udp4');

  server.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    try {
      const packet: TelemetryPayload = JSON.parse(msg.toString('utf-8'));
      totalReceivedCount++;

      // Packet Loss Tracking (Sequence ID Continuity Check)
      if (typeof packet.seqId === 'number') {
        const incomingSeq = packet.seqId;
        if (lastSequenceId > 0 && incomingSeq > lastSequenceId + 1) {
          const dropped = incomingSeq - (lastSequenceId + 1);
          totalPacketLossCount += dropped;
          console.warn(
            `⚠️ [Packet Loss Detected] Sequence loncat: Diharapkan #${lastSequenceId + 1}, Diterima #${incomingSeq} (${dropped} paket hilang). Total loss: ${totalPacketLossCount}`
          );
        }
        lastSequenceId = Math.max(lastSequenceId, incomingSeq);
      }

      // Heartbeat Packet Handling
      if (packet.type === 'HEARTBEAT') {
        lastHeartbeatTimestamp = Date.now();
        if (isMainServerUnresponsive) {
          isMainServerUnresponsive = false;
          console.log(`✅ [WATCHDOG RESOLVED] Sinyal Heartbeat pulih. Server utama terhubung kembali.`);
        }
        return; // Heartbeats are not saved to persistent DB log table
      }

      // OOM Protection: Protect RAM from exceeding capacity
      if (logBuffer.length >= MAX_BUFFER_LIMIT) {
        console.warn(`⚠️ [OOM Protection] Buffer RAM mencapai batas ${MAX_BUFFER_LIMIT} items. Memicu flush darurat!`);
        flushBuffer();
        return;
      }

      // Add to Double Buffer
      logBuffer.push(packet);

      // Hybrid Flush Trigger 1: Threshold 100 items reached
      if (logBuffer.length >= BATCH_SIZE) {
        flushBuffer();
      }
    } catch (err: any) {
      console.error('[Aggregator Message Parse Error]', err.message);
    }
  });

  server.on('error', (err: Error) => {
    console.error('[Aggregator Server Error]', err);
    server.close();
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`=======================================================`);
    console.log(`📡 UDP LOG AGGREGATOR SERVER AKTIF`);
    console.log(`   Host        : ${address.address}`);
    console.log(`   Port        : ${address.port}`);
    console.log(`   Batch Size  : ${BATCH_SIZE} items`);
    console.log(`   Interval    : ${FLUSH_INTERVAL_MS} ms`);
    console.log(`   Watchdog    : ${WATCHDOG_THRESHOLD_MS / 1000}s threshold`);
    console.log(`   Prisma DB   : PostgreSQL connected via pool adapter`);
    console.log(`=======================================================`);
  });

  return server;
}

// -------------------------------------------------------------
// 4. Execution Bootstrap (if executed directly)
// -------------------------------------------------------------
let runningServer: dgram.Socket | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let watchdogTimer: NodeJS.Timeout | null = null;

export function startAggregator(): dgram.Socket {
  if (runningServer) return runningServer;

  runningServer = createAggregatorServer();
  runningServer.bind(UDP_PORT, UDP_HOST);

  // Hybrid Flush Trigger 2: 2000ms periodic timer
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  watchdogTimer = startWatchdogTimer();

  return runningServer;
}

export function stopAggregator(): Promise<void> {
  return new Promise((resolve) => {
    if (flushTimer) clearInterval(flushTimer);
    if (watchdogTimer) clearInterval(watchdogTimer);

    if (runningServer) {
      // Flush remaining logs before closing
      flushBuffer().finally(() => {
        runningServer?.close(() => {
          runningServer = null;
          console.log('[Aggregator] Server stopped gracefully.');
          resolve();
        });
      });
    } else {
      resolve();
    }
  });
}

// Auto-run if executed as standalone script (e.g. `npm run aggregator:dev` or `ts-node src/aggregator/index.ts`)
if (require.main === module) {
  startAggregator();

  const handleShutdown = async () => {
    console.log('\n[Aggregator] Menutup server...');
    await stopAggregator();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}
