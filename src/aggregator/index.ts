import dotenv from 'dotenv';
dotenv.config();

import dgram from 'dgram';
import http from 'http';
import { performance } from 'perf_hooks';
import { prisma } from '../config/prisma';
import type { TelemetryPayload } from '../utils/udpLogger';

// Configuration
const UDP_PORT = parseInt(process.env.UDP_PORT || '5001', 10);
const UDP_HOST = process.env.UDP_HOST || '0.0.0.0';

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER_LIMIT = 50000; // Increased buffer limit for ultra-high throughput
const WATCHDOG_THRESHOLD_MS = 15000; // 15 seconds threshold
const WATCHDOG_CHECK_INTERVAL_MS = 3000;

// State Variables
let logBuffer: TelemetryPayload[] = [];
let isFlushing = false;
let lastOomWarningTime = 0;

// Metrics & Packet Loss / Recovery Tracking
export interface AggregatorMetrics {
  totalReceived: number;
  totalLogsInserted: number;
  totalPacketLoss: number;
  totalRecovered: number;
  nackRequestsSent: number;
  lossRatePercent: string;
  rawLossRatePercent: string;
  effectiveLossRatePercent: string;
  lastSeqId: number;
  currentBufferSize: number;
  isMainServerAlive: boolean;
  lastHeartbeatTime: number | null;
  uptimeSeconds: number;
  activeReliabilityMethods: string[];
}

let totalReceivedCount = 0;
let totalLogsInserted = 0;
let totalPacketLossCount = 0;
let totalRecoveredCount = 0;
let nackRequestsCount = 0;
let lastSequenceId = 0;
let lastHeartbeatTimestamp: number | null = null;
let isMainServerUnresponsive = false;
const startTime = Date.now();

export function getAggregatorMetrics(): AggregatorMetrics {
  const totalExpected = totalReceivedCount + totalPacketLossCount;
  const rawLossRate = totalExpected > 0
    ? ((totalPacketLossCount / totalExpected) * 100).toFixed(2)
    : '0.00';

  const unrecovered = Math.max(0, totalPacketLossCount - totalRecoveredCount);
  const effectiveLossRate = totalExpected > 0
    ? ((unrecovered / totalExpected) * 100).toFixed(2)
    : '0.00';

  return {
    totalReceived: totalReceivedCount,
    totalLogsInserted,
    totalPacketLoss: totalPacketLossCount,
    totalRecovered: totalRecoveredCount,
    nackRequestsSent: nackRequestsCount,
    lossRatePercent: `${effectiveLossRate}%`,
    rawLossRatePercent: `${rawLossRate}%`,
    effectiveLossRatePercent: `${effectiveLossRate}%`,
    lastSeqId: lastSequenceId,
    currentBufferSize: logBuffer.length,
    isMainServerAlive: !isMainServerUnresponsive && lastHeartbeatTimestamp !== null,
    lastHeartbeatTime: lastHeartbeatTimestamp,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    activeReliabilityMethods: [
      'Method 1: NACK-Based Selective Retransmission (Ring Buffer + TCP Channel)',
      'Method 2: Tiered Severity & Hybrid TCP Fallback (Circuit Breaker)',
      'Method 3: Piggybacking / Redundant Sliding Window (Zero-RTT FEC Recovery)'
    ],
  };
}

export function resetAggregatorMetrics(): void {
  totalReceivedCount = 0;
  totalLogsInserted = 0;
  totalPacketLossCount = 0;
  totalRecoveredCount = 0;
  nackRequestsCount = 0;
  lastSequenceId = 0;
  logBuffer = [];
}

// -------------------------------------------------------------
// Direct Log Ingestion (for Method 2: TCP Fallback)
// -------------------------------------------------------------
export function ingestDirectLog(packet: TelemetryPayload): void {
  totalReceivedCount++;
  logBuffer.push(packet);
  if (logBuffer.length >= BATCH_SIZE) {
    flushBuffer();
  }
}

// -------------------------------------------------------------
// METHOD 1 RECOVERY: NACK Selective Retransmission via TCP
// When missing sequence IDs are detected, request retransmission
// from the sender's sliding window ring buffer over TCP.
// -------------------------------------------------------------
function triggerNackRecovery(missingSeqs: number[]): void {
  if (missingSeqs.length === 0) return;
  nackRequestsCount++;

  const mainApiHost = process.env.API_HOST || (UDP_HOST === '0.0.0.0' ? '127.0.0.1' : UDP_HOST);
  const mainApiPort = parseInt(process.env.PORT || '5000', 10);

  const payload = JSON.stringify({ seqIds: missingSeqs });
  const req = http.request(
    {
      hostname: mainApiHost,
      port: mainApiPort,
      path: '/api/benchmark/telemetry-resend',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 3000,
    },
    (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && Array.isArray(json.recoveredLogs)) {
            for (const log of json.recoveredLogs) {
              logBuffer.push(log);
              totalRecoveredCount++;
            }
            console.log(
              `🔄 [NACK ARQ Recovery] Berhasil memulihkan ${json.recoveredLogs.length} paket log yang hilang via TCP!`
            );
          }
        } catch {
          // Parse error ignored
        }
      });
    }
  );

  req.on('error', (err) => {
    // Non-blocking recovery request
    console.warn('[NACK Retransmission Channel Notice]', err.message);
  });

  req.write(payload);
  req.end();
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

    // Bulk-Insert via Prisma with duplicate safety
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
// 3. UDP Socket Server Setup with Self-Healing Logic
// -------------------------------------------------------------
export function createAggregatorServer(): dgram.Socket {
  const server = dgram.createSocket('udp4');

  server.on('message', (msg: Buffer, _rinfo: dgram.RemoteInfo) => {
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

          const missingSeqs: number[] = [];
          for (let s = lastSequenceId + 1; s < incomingSeq; s++) {
            missingSeqs.push(s);
          }

          // METHOD 3 RECOVERY: Check Piggyback payload first (Zero-RTT recovery)
          const remainingMissingSeqs: number[] = [];
          if (Array.isArray(packet.piggyback)) {
            for (const mSeq of missingSeqs) {
              const recoveredFromPiggyback = packet.piggyback.find((p) => p.seqId === mSeq);
              if (recoveredFromPiggyback) {
                logBuffer.push({
                  ...recoveredFromPiggyback,
                  timestamp: packet.timestamp,
                });
                totalRecoveredCount++;
                console.log(`⚡ [Piggyback Zero-RTT Recovery] Pulih seq #${mSeq} langsung dari redundant datagram payload!`);
              } else {
                remainingMissingSeqs.push(mSeq);
              }
            }
          } else {
            remainingMissingSeqs.push(...missingSeqs);
          }

          // METHOD 1 RECOVERY: Request NACK Selective Retransmission via TCP for any unrecovered packets
          if (remainingMissingSeqs.length > 0) {
            triggerNackRecovery(remainingMissingSeqs);
          }
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
        return;
      }

      // OOM Protection with log throttling (max 1 warning per 3 seconds)
      if (logBuffer.length >= MAX_BUFFER_LIMIT) {
        const now = Date.now();
        if (now - lastOomWarningTime > 3000) {
          console.warn(`⚠️ [OOM Protection] Buffer RAM mencapai batas ${MAX_BUFFER_LIMIT} items. Memicu flush darurat!`);
          lastOomWarningTime = now;
        }
        if (!isFlushing) {
          flushBuffer();
        }
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

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Aggregator] Port ${UDP_PORT} already in use. Assuming standalone Aggregator process is active.`);
      return;
    }
    console.error('[Aggregator Server Error]', err);
    server.close();
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`=======================================================`);
    console.log(`📡 RELIABLE UDP LOG AGGREGATOR SERVER AKTIF (SELF-HEALING)`);
    console.log(`   Host        : ${address.address}`);
    console.log(`   Port        : ${address.port}`);
    console.log(`   Method 1    : NACK ARQ Selective Retransmission (Active)`);
    console.log(`   Method 2    : Tiered Severity & Hybrid TCP Fallback (Active)`);
    console.log(`   Method 3    : Piggybacking Zero-RTT Sliding Window (Active)`);
    console.log(`   Batch Size  : ${BATCH_SIZE} items | Flush Interval: ${FLUSH_INTERVAL_MS}ms`);
    console.log(`   Watchdog    : ${WATCHDOG_THRESHOLD_MS / 1000}s threshold`);
    console.log(`=======================================================`);
  });

  return server;
}

// -------------------------------------------------------------
// 4. Execution Bootstrap
// -------------------------------------------------------------
let runningServer: dgram.Socket | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let watchdogTimer: NodeJS.Timeout | null = null;
let retentionTimer: NodeJS.Timeout | null = null;

/**
 * Automatically prunes telemetry logs older than retention days (default: 7 days)
 * to prevent database bloat and storage garbage accumulation.
 */
export async function pruneOldTelemetryLogs(retentionDays = 7): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const deleteResult = await prisma.telemetryLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    if (deleteResult.count > 0) {
      console.log(`🧹 [Retention Policy] Berhasil membuang ${deleteResult.count} baris log usang (> ${retentionDays} hari).`);
    }
    return deleteResult.count;
  } catch (err: any) {
    console.warn('[Log Retention Error]', err.message);
    return 0;
  }
}

export function startAggregator(): dgram.Socket {
  if (runningServer) return runningServer;

  runningServer = createAggregatorServer();
  runningServer.bind(UDP_PORT, UDP_HOST);

  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  watchdogTimer = startWatchdogTimer();

  // Run retention cleanup on startup and every 6 hours
  pruneOldTelemetryLogs(7);
  retentionTimer = setInterval(() => pruneOldTelemetryLogs(7), 6 * 60 * 60 * 1000);

  return runningServer;
}

export function stopAggregator(): Promise<void> {
  return new Promise((resolve) => {
    if (flushTimer) clearInterval(flushTimer);
    if (watchdogTimer) clearInterval(watchdogTimer);
    if (retentionTimer) clearInterval(retentionTimer);

    if (runningServer) {
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

// Auto-run if executed as standalone script
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
