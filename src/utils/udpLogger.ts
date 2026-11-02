import dgram from 'dgram';
import net from 'net';

// Network Target Configuration
const UDP_HOST = process.env.UDP_HOST || '127.0.0.1';
const UDP_PORT = parseInt(process.env.UDP_PORT || '5001', 10);
const TCP_RECOVERY_PORT = parseInt(process.env.TCP_RECOVERY_PORT || process.env.TCP_PORT || '5002', 10);

export interface TelemetryPayload {
  seqId?: number;
  type?: 'LOG' | 'HEARTBEAT' | 'CHECKPOINT' | 'RETRANSMIT';
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  latencyMs?: number;
  userId?: number;
  message?: string;
  metadata?: any;
  timestamp?: number | string;
}

// Global auto-increment sequence ID
let currentSequenceId = 1;

// ==============================================================================
// 1. Sliding-Window Ring Buffer (In-Memory Packet Cache for ARQ Retransmission)
// ==============================================================================
const RING_BUFFER_CAPACITY = 2000;
const ringBuffer = new Map<number, TelemetryPayload>();

export function cacheInRingBuffer(seqId: number, packet: TelemetryPayload): void {
  ringBuffer.set(seqId, packet);
  if (ringBuffer.size > RING_BUFFER_CAPACITY) {
    // Evict oldest sequence entry
    const oldestKey = ringBuffer.keys().next().value;
    if (oldestKey !== undefined) {
      ringBuffer.delete(oldestKey);
    }
  }
}

export function getPacketsFromRingBuffer(seqIds: number[]): TelemetryPayload[] {
  const result: TelemetryPayload[] = [];
  for (const id of seqIds) {
    const pkt = ringBuffer.get(id);
    if (pkt) {
      result.push(pkt);
    }
  }
  return result;
}

export function getRingBufferStats() {
  return {
    cachedPacketsCount: ringBuffer.size,
    capacity: RING_BUFFER_CAPACITY,
    oldestSeqId: ringBuffer.size > 0 ? ringBuffer.keys().next().value : null,
    latestSeqId: currentSequenceId - 1,
  };
}

// ==============================================================================
// 2. Sensitive Data Masking Helper
// ==============================================================================
const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'authorization',
  'auth',
  'secret',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'bearer',
]);

export function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      masked[key] = '***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

// ==============================================================================
// 3. UDP Client Socket (Primary Fast Path ~0.3ms)
// ==============================================================================
let udpSocket: dgram.Socket | null = null;

function getUdpSocket(): dgram.Socket {
  if (!udpSocket) {
    udpSocket = dgram.createSocket('udp4');
    udpSocket.on('error', (err) => {
      console.warn('[UDP Client Socket Error]', err.message);
    });
  }
  return udpSocket;
}

// ==============================================================================
// 4. TCP Recovery & Control Client (ARQ Retransmission & Critical Fallback)
// ==============================================================================
let tcpClient: net.Socket | null = null;
let tcpReconnectTimer: NodeJS.Timeout | null = null;
let tcpIncomingBuffer = '';
let isTcpConnecting = false;

export function getTcpRecoveryClient(): net.Socket | null {
  if (tcpClient && !tcpClient.destroyed) {
    return tcpClient;
  }

  if (isTcpConnecting) return null;
  isTcpConnecting = true;

  try {
    const client = new net.Socket();

    client.connect(TCP_RECOVERY_PORT, UDP_HOST, () => {
      isTcpConnecting = false;
      tcpClient = client;
      console.log(`🔗 [TCP Recovery Client] Terhubung ke Telemetry Aggregator TCP (Port ${TCP_RECOVERY_PORT})`);
      
      // Handshake identity
      const handshake = JSON.stringify({ type: 'HANDSHAKE', client: 'wms-api-worker', timestamp: Date.now() }) + '\n';
      client.write(handshake);
    });

    client.on('data', (data: Buffer) => {
      tcpIncomingBuffer += data.toString('utf-8');
      const lines = tcpIncomingBuffer.split('\n');
      tcpIncomingBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const message = JSON.parse(line);
          handleAggregatorTcpMessage(message, client);
        } catch {
          // Ignore parse errors on malformed chunks
        }
      }
    });

    client.on('error', (err) => {
      // Non-blocking log, avoid throwing unhandled exception
      isTcpConnecting = false;
    });

    client.on('close', () => {
      tcpClient = null;
      isTcpConnecting = false;
      // Schedule background reconnect attempt
      if (!tcpReconnectTimer) {
        tcpReconnectTimer = setTimeout(() => {
          tcpReconnectTimer = null;
          getTcpRecoveryClient();
        }, 5000);
        tcpReconnectTimer.unref();
      }
    });

    return client;
  } catch {
    isTcpConnecting = false;
    return null;
  }
}

/**
 * Handles incoming control messages from Aggregator (e.g. NACK requests for missing sequences)
 */
function handleAggregatorTcpMessage(msg: any, socket: net.Socket): void {
  // Method 1: NACK Selective Retransmission Request
  if (msg.type === 'NACK' && Array.isArray(msg.missingSeqIds)) {
    const missingIds: number[] = msg.missingSeqIds;
    const retransmitPackets = getPacketsFromRingBuffer(missingIds);

    if (retransmitPackets.length > 0) {
      console.log(
        `🔁 [ARQ Retransmit] Aggregator melaporkan ${missingIds.length} paket hilang. Menemukan ${retransmitPackets.length} paket di Ring Buffer, mengirim ulang via TCP...`
      );

      const response = JSON.stringify({
        type: 'RETRANSMIT_PAYLOAD',
        packets: retransmitPackets,
        timestamp: Date.now(),
      }) + '\n';

      socket.write(response);
    } else {
      console.warn(
        `⚠️ [ARQ Retransmit] Paket #${missingIds.join(', #')} diminta Aggregator tetapi sudah terhapus dari Sliding Window.`
      );
    }
  }
}

/**
 * Sends a telemetry packet directly through TCP (Method 2: Tiered Reliability / Circuit Breaker)
 */
export function sendTcpTelemetry(payload: TelemetryPayload): boolean {
  const client = getTcpRecoveryClient();
  if (!client || client.destroyed) {
    return false;
  }

  try {
    const msg = JSON.stringify({
      type: 'DIRECT_TCP',
      packet: payload,
    }) + '\n';
    return client.write(msg);
  } catch {
    return false;
  }
}

// ==============================================================================
// 5. Dual-Track Telemetry Dispatcher (Zero-Wait Fire-and-Forget + ARQ Cache)
// ==============================================================================
export function sendUdpTelemetry(payload: TelemetryPayload): number {
  const seq = payload.seqId !== undefined ? payload.seqId : currentSequenceId++;
  if (payload.seqId !== undefined && payload.seqId >= currentSequenceId) {
    currentSequenceId = payload.seqId + 1;
  }

  const packet: TelemetryPayload = {
    ...payload,
    seqId: seq,
    type: payload.type || 'LOG',
    timestamp: payload.timestamp || Date.now(),
    metadata: payload.metadata ? maskSensitiveData(payload.metadata) : undefined,
  };

  // 1. Cache in Sliding Window Ring Buffer for possible ARQ Selective Retransmission
  cacheInRingBuffer(seq, packet);

  // 2. Primary Fast-Path: Fire-and-Forget via UDP Socket (~0.3ms latency)
  try {
    const buffer = Buffer.from(JSON.stringify(packet));
    const socket = getUdpSocket();

    socket.send(buffer, 0, buffer.length, UDP_PORT, UDP_HOST, (err) => {
      // Method 2 (Circuit Breaker Fallback): If UDP socket fails, fallback to TCP stream
      if (err) {
        sendTcpTelemetry(packet);
      }
    });
  } catch {
    // If UDP throws synchronously, fallback to TCP stream
    sendTcpTelemetry(packet);
  }

  // Method 2 (Level-Based Tiering): If log level is ERROR or FATAL, guarantee delivery via TCP as well
  if (packet.level === 'ERROR' || packet.level === 'FATAL') {
    sendTcpTelemetry(packet);
  }

  return seq;
}

// ==============================================================================
// 6. Heartbeat & Periodic TCP Checkpoint Timers
// ==============================================================================
let heartbeatTimer: NodeJS.Timeout | null = null;
let checkpointTimer: NodeJS.Timeout | null = null;

/**
 * Starts automatic Heartbeat signal transmission every 5 seconds (5000 ms)
 */
export function startHeartbeat(intervalMs = 5000): void {
  if (heartbeatTimer) return;

  // Initialize TCP connection in background
  getTcpRecoveryClient();

  // Initial heartbeat
  sendUdpTelemetry({
    type: 'HEARTBEAT',
    level: 'INFO',
    message: 'Heartbeat signal: Main WMS API is active',
    timestamp: Date.now(),
  });

  heartbeatTimer = setInterval(() => {
    sendUdpTelemetry({
      type: 'HEARTBEAT',
      level: 'INFO',
      message: 'Heartbeat signal: Main WMS API is active',
      timestamp: Date.now(),
    });
  }, intervalMs);

  heartbeatTimer.unref();

  // Method 3: Periodic TCP Checkpoint & State Reconciliation (Every 10 seconds)
  startPeriodicCheckpoint(10000);
}

/**
 * Method 3: Sends Periodic State Checkpoints over TCP
 */
export function startPeriodicCheckpoint(intervalMs = 10000): void {
  if (checkpointTimer) return;

  checkpointTimer = setInterval(() => {
    const client = getTcpRecoveryClient();
    if (client && !client.destroyed) {
      const checkpointMsg = JSON.stringify({
        type: 'CHECKPOINT',
        client: 'wms-api',
        lastEmittedSeqId: currentSequenceId - 1,
        ringBufferSize: ringBuffer.size,
        timestamp: Date.now(),
      }) + '\n';
      client.write(checkpointMsg);
    }
  }, intervalMs);

  checkpointTimer.unref();
}

/**
 * Stops automatic Heartbeat and Checkpoint signals
 */
export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (checkpointTimer) {
    clearInterval(checkpointTimer);
    checkpointTimer = null;
  }
}

/**
 * Closes all sockets cleanly (UDP and TCP)
 */
export function closeUdpClient(): Promise<void> {
  stopHeartbeat();

  if (tcpReconnectTimer) {
    clearTimeout(tcpReconnectTimer);
    tcpReconnectTimer = null;
  }

  if (tcpClient) {
    tcpClient.destroy();
    tcpClient = null;
  }

  return new Promise((resolve) => {
    if (udpSocket) {
      udpSocket.close(() => {
        udpSocket = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
