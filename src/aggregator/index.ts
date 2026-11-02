import dotenv from 'dotenv';
dotenv.config();

import dgram from 'dgram';
import net from 'net';
import { performance } from 'perf_hooks';
import { prisma } from '../config/prisma';
import type { TelemetryPayload } from '../utils/udpLogger';

// Network Configuration
const UDP_PORT = parseInt(process.env.UDP_PORT || '5001', 10);
const UDP_HOST = process.env.UDP_HOST || '0.0.0.0';
const TCP_RECOVERY_PORT = parseInt(process.env.TCP_RECOVERY_PORT || process.env.TCP_PORT || '5002', 10);

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER_LIMIT = 10000;
const WATCHDOG_THRESHOLD_MS = 15000; // 15 seconds threshold
const WATCHDOG_CHECK_INTERVAL_MS = 3000;

// State Variables
let logBuffer: TelemetryPayload[] = [];
let isFlushing = false;

// Metrics & Packet Loss / Recovery Tracking
export interface AggregatorMetrics {
  totalReceived: number;
  totalLogsInserted: number;
  totalPacketLossDetected: number;
  totalRecoveredViaTcp: number;
  netUnrecoveredLoss: number;
  lossRatePercent: string;
  recoveryRatePercent: string;
  lastSeqId: number;
  currentBufferSize: number;
  isMainServerAlive: boolean;
  lastHeartbeatTime: number | null;
  uptimeSeconds: number;
  activeTcpClients: number;
}

let totalReceivedCount = 0;
let totalLogsInserted = 0;
let totalPacketLossCount = 0;
let totalRecoveredCount = 0;
let lastSequenceId = 0;
let lastHeartbeatTimestamp: number | null = null;
let isMainServerUnresponsive = false;
const startTime = Date.now();

// Active TCP Recovery Sockets
const activeTcpClients = new Set<net.Socket>();

export function getAggregatorMetrics(): AggregatorMetrics {
  const totalExpected = totalReceivedCount + totalPacketLossCount;
  const netLoss = Math.max(0, totalPacketLossCount - totalRecoveredCount);
  const lossRate = totalExpected > 0
    ? ((totalPacketLossCount / totalExpected) * 100).toFixed(2)
    : '0.00';
  const recoveryRate = totalPacketLossCount > 0
    ? ((totalRecoveredCount / totalPacketLossCount) * 100).toFixed(2)
    : '100.00';

  return {
    totalReceived: totalReceivedCount,
    totalLogsInserted,
    totalPacketLossDetected: totalPacketLossCount,
    totalRecoveredViaTcp: totalRecoveredCount,
    netUnrecoveredLoss: netLoss,
    lossRatePercent: `${lossRate}%`,
    recoveryRatePercent: `${recoveryRate}%`,
    lastSeqId: lastSequenceId,
    currentBufferSize: logBuffer.length,
    isMainServerAlive: !isMainServerUnresponsive && lastHeartbeatTimestamp !== null,
    lastHeartbeatTime: lastHeartbeatTimestamp,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    activeTcpClients: activeTcpClients.size,
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
// 3. TCP Recovery Server (ARQ NACK Retransmission & Direct TCP)
// -------------------------------------------------------------
function broadcastNack(missingSeqIds: number[]): void {
  if (activeTcpClients.size === 0) {
    console.warn(
      `⚠️ [NACK Notice] Tidak ada TCP recovery client yang terhubung untuk meminta retransmit paket #${missingSeqIds.join(', #')}.`
    );
    return;
  }

  const nackMessage = JSON.stringify({
    type: 'NACK',
    missingSeqIds,
    timestamp: Date.now(),
  }) + '\n';

  for (const client of activeTcpClients) {
    try {
      client.write(nackMessage);
    } catch {
      // Ignore broken client sockets
    }
  }

  console.log(
    `📡 [NACK Sent] Meminta pengiriman ulang ${missingSeqIds.length} paket hilang (Seq #${missingSeqIds[0]} - #${missingSeqIds[missingSeqIds.length - 1]}) via TCP...`
  );
}

export function createTcpRecoveryServer(): net.Server {
  const server = net.createServer((socket: net.Socket) => {
    activeTcpClients.add(socket);
    console.log(`🔗 [TCP Recovery] Client terhubung dari ${socket.remoteAddress}:${socket.remotePort}`);

    let chunkBuffer = '';

    socket.on('data', (data: Buffer) => {
      chunkBuffer += data.toString('utf-8');
      const lines = chunkBuffer.split('\n');
      chunkBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);

          // Handle Method 1: ARQ Retransmit Payload
          if (msg.type === 'RETRANSMIT_PAYLOAD' && Array.isArray(msg.packets)) {
            const packets: TelemetryPayload[] = msg.packets;
            for (const pkt of packets) {
              logBuffer.push(pkt);
            }
            totalRecoveredCount += packets.length;
            totalReceivedCount += packets.length;

            console.log(
              `✅ [ARQ Recovery Success] Berhasil merecovery ${packets.length} paket yang hilang via TCP! Net Unrecovered Loss: ${Math.max(
                0,
                totalPacketLossCount - totalRecoveredCount
              )}`
            );

            if (logBuffer.length >= BATCH_SIZE) {
              flushBuffer();
            }
          }

          // Handle Method 2: Direct TCP Fallback (e.g. Critical Errors or Circuit Breaker)
          if (msg.type === 'DIRECT_TCP' && msg.packet) {
            logBuffer.push(msg.packet);
            totalReceivedCount++;
            if (logBuffer.length >= BATCH_SIZE) {
              flushBuffer();
            }
          }

          // Handle Method 3: Periodic Checkpoint Digest
          if (msg.type === 'CHECKPOINT' && typeof msg.lastEmittedSeqId === 'number') {
            const emittedSeq = msg.lastEmittedSeqId;
            if (emittedSeq > lastSequenceId) {
              const missing: number[] = [];
              for (let s = lastSequenceId + 1; s <= emittedSeq; s++) {
                missing.push(s);
              }
              totalPacketLossCount += missing.length;
              lastSequenceId = emittedSeq;
              broadcastNack(missing);
            }
          }
        } catch {
          // Ignore malformed JSON chunks
        }
      }
    });

    socket.on('error', () => {
      activeTcpClients.delete(socket);
    });

    socket.on('close', () => {
      activeTcpClients.delete(socket);
    });
  });

  return server;
}

// -------------------------------------------------------------
// 4. UDP Socket Server Setup (Primary High-Throughput Path)
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
          const missingSeqIds: number[] = [];
          for (let s = lastSequenceId + 1; s < incomingSeq; s++) {
            missingSeqIds.push(s);
          }
          const dropped = missingSeqIds.length;
          totalPacketLossCount += dropped;

          console.warn(
            `⚠️ [Packet Loss Detected] Sequence loncat: Diharapkan #${lastSequenceId + 1}, Diterima #${incomingSeq} (${dropped} paket hilang). Total loss detected: ${totalPacketLossCount}`
          );

          // Method 1: Automatically trigger NACK retransmission request over TCP!
          broadcastNack(missingSeqIds);
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

      // OOM Protection
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
    console.log(`📡 DUAL-TRACK TELEMETRY AGGREGATOR RUNNING`);
    console.log(`   UDP Fast-Path   : ${address.address}:${address.port}/udp (~0.3ms latency)`);
    console.log(`   TCP Recovery    : Port ${TCP_RECOVERY_PORT}/tcp (ARQ NACK Retransmission)`);
    console.log(`   Batch Size      : ${BATCH_SIZE} items`);
    console.log(`   Flush Interval  : ${FLUSH_INTERVAL_MS} ms`);
    console.log(`   Watchdog        : ${WATCHDOG_THRESHOLD_MS / 1000}s threshold`);
    console.log(`   Database Target : PostgreSQL (Prisma telemetryLog)`);
    console.log(`=======================================================`);
  });

  return server;
}

// -------------------------------------------------------------
// 5. Execution Bootstrap (Start / Stop Lifecycle)
// -------------------------------------------------------------
let runningUdpServer: dgram.Socket | null = null;
let runningTcpServer: net.Server | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let watchdogTimer: NodeJS.Timeout | null = null;

export function startAggregator(): { udp: dgram.Socket; tcp: net.Server } {
  if (runningUdpServer && runningTcpServer) {
    return { udp: runningUdpServer, tcp: runningTcpServer };
  }

  // 1. Start UDP Datagram Receiver (Port 5001)
  runningUdpServer = createAggregatorServer();
  runningUdpServer.bind(UDP_PORT, UDP_HOST);

  // 2. Start TCP Recovery & Control Server (Port 5002)
  runningTcpServer = createTcpRecoveryServer();
  runningTcpServer.listen(TCP_RECOVERY_PORT, () => {
    console.log(`🔒 [TCP Recovery Server] Mendengarkan di port ${TCP_RECOVERY_PORT} untuk Selective Retransmission`);
  });

  // 3. Start Periodic Flush & Watchdog Timers
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS);
  watchdogTimer = startWatchdogTimer();

  return { udp: runningUdpServer, tcp: runningTcpServer };
}

export function stopAggregator(): Promise<void> {
  return new Promise((resolve) => {
    if (flushTimer) clearInterval(flushTimer);
    if (watchdogTimer) clearInterval(watchdogTimer);

    // Close TCP Clients & Server
    for (const client of activeTcpClients) {
      client.destroy();
    }
    activeTcpClients.clear();

    if (runningTcpServer) {
      runningTcpServer.close();
      runningTcpServer = null;
    }

    // Flush remaining logs before closing UDP
    flushBuffer().finally(() => {
      if (runningUdpServer) {
        runningUdpServer.close(() => {
          runningUdpServer = null;
          console.log('[Aggregator] All telemetry servers (UDP + TCP) stopped gracefully.');
          resolve();
        });
      } else {
        resolve();
      }
    });
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
