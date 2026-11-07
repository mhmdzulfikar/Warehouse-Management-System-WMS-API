import dgram from 'dgram';
import http from 'http';

// UDP & TCP Target Configuration
const UDP_HOST = process.env.UDP_HOST || '127.0.0.1';
const UDP_PORT = parseInt(process.env.UDP_PORT || '5001', 10);
const API_PORT = parseInt(process.env.PORT || '5000', 10);

export interface TelemetryPayload {
  seqId?: number;
  type?: 'LOG' | 'HEARTBEAT';
  level?: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  latencyMs?: number;
  userId?: number;
  message?: string;
  metadata?: any;
  timestamp?: number | string;
  // Method 3: Piggybacked history of previous sequence IDs for zero RTT recovery
  piggyback?: Array<{ seqId: number; message?: string; level?: string; endpoint?: string; statusCode?: number }>;
  // Method 2: Flag for critical logs requiring TCP guarantee
  critical?: boolean;
}

// Global auto-increment sequence ID
let currentSequenceId = 1;

// UDP Client Socket Singleton
let udpSocket: dgram.Socket | null = null;

// ============================================================================
// METHOD 1 INFRASTRUCTURE: In-Memory Sliding Window (Ring Buffer) for NACK ARQ
// Stores the last 3,000 sent packets so that if any UDP datagram is lost,
// the Aggregator can request selective retransmission via TCP.
// ============================================================================
const RING_BUFFER_MAX_SIZE = 3000;
const ringBuffer = new Map<number, TelemetryPayload>();
const ringBufferOrder: number[] = [];

export function storeInRingBuffer(seqId: number, packet: TelemetryPayload): void {
  ringBuffer.set(seqId, packet);
  ringBufferOrder.push(seqId);

  // Evict oldest entries when capacity threshold is reached (Sliding Window)
  if (ringBufferOrder.length > RING_BUFFER_MAX_SIZE) {
    const oldestSeq = ringBufferOrder.shift();
    if (oldestSeq !== undefined) {
      ringBuffer.delete(oldestSeq);
    }
  }
}

/**
 * Retrieves missing log packets requested by the Aggregator via NACK
 */
export function getLogsFromRingBuffer(seqIds: number[]): TelemetryPayload[] {
  const foundLogs: TelemetryPayload[] = [];
  for (const seq of seqIds) {
    const log = ringBuffer.get(seq);
    if (log) {
      foundLogs.push(log);
    }
  }
  return foundLogs;
}

/**
 * Get current ring buffer statistics
 */
export function getRingBufferStats(): { bufferedCount: number; minSeq: number; maxSeq: number } {
  return {
    bufferedCount: ringBuffer.size,
    minSeq: ringBufferOrder.length > 0 ? ringBufferOrder[0] : 0,
    maxSeq: ringBufferOrder.length > 0 ? ringBufferOrder[ringBufferOrder.length - 1] : 0,
  };
}

export function resetRingBuffer(): void {
  ringBuffer.clear();
  ringBufferOrder.length = 0;
  currentSequenceId = 1;
}

function getSocket(): dgram.Socket {
  if (!udpSocket) {
    udpSocket = dgram.createSocket('udp4');
    udpSocket.on('error', (err) => {
      console.warn('[UDP Client Socket Error]', err.message);
    });
  }
  return udpSocket;
}

// Sensitive Field Names for Data Masking
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

/**
 * Recursively masks sensitive fields in objects/arrays (e.g., passwords, auth tokens)
 */
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

// ============================================================================
// METHOD 2: Tiered Severity & Hybrid TCP Fallback Channel
// For critical error logs (500 Server Error) or when UDP socket buffer overflows
// ============================================================================
export function dispatchTcpFallback(packet: TelemetryPayload): void {
  // Asynchronously dispatch directly to Aggregator's TCP ingestion without blocking
  setImmediate(async () => {
    try {
      const payloadString = JSON.stringify(packet);
      const req = http.request(
        {
          hostname: UDP_HOST === '0.0.0.0' ? '127.0.0.1' : UDP_HOST,
          port: API_PORT,
          path: '/api/benchmark/telemetry-tcp-ingest',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payloadString),
          },
          timeout: 2000,
        },
        (res) => {
          res.resume(); // Consume stream to free memory
        }
      );

      req.on('error', () => {
        // Fallback is non-blocking to prevent cascading thread stalls
      });

      req.write(payloadString);
      req.end();
    } catch {
      // Non-blocking safety net
    }
  });
}

/**
 * Sends a Telemetry log packet using the Reliable Dual-Track Tri-Method:
 * 1. Fast-Path UDP Datagram (Zero-Wait ~0.3ms)
 * 2. Stored in Ring Buffer for NACK Selective Retransmission
 * 3. Piggybacks last 2 sequence signatures for immediate single-packet drop recovery
 * 4. Dual-dispatched over TCP fallback if level is ERROR or critical
 */
export function sendUdpTelemetry(payload: TelemetryPayload): number {
  const seq = payload.seqId !== undefined ? payload.seqId : currentSequenceId++;
  if (payload.seqId !== undefined && payload.seqId >= currentSequenceId) {
    currentSequenceId = payload.seqId + 1;
  }

  // METHOD 3: Piggybacking last 2 packets from ring buffer for zero-RTT single-drop recovery
  let piggybackList: any[] | undefined = undefined;
  if (payload.type !== 'HEARTBEAT') {
    const p1 = ringBuffer.get(seq - 1);
    const p2 = ringBuffer.get(seq - 2);
    piggybackList = [];
    if (p2) piggybackList.push({ seqId: p2.seqId, level: p2.level, endpoint: p2.endpoint, statusCode: p2.statusCode, message: p2.message });
    if (p1) piggybackList.push({ seqId: p1.seqId, level: p1.level, endpoint: p1.endpoint, statusCode: p1.statusCode, message: p1.message });
    if (piggybackList.length === 0) piggybackList = undefined;
  }

  const packet: TelemetryPayload = {
    ...payload,
    seqId: seq,
    type: payload.type || 'LOG',
    timestamp: payload.timestamp || Date.now(),
    metadata: payload.metadata ? maskSensitiveData(payload.metadata) : undefined,
    piggyback: piggybackList,
  };

  // 1. Store in Ring Buffer for Method 1 (NACK Retransmission)
  if (packet.type !== 'HEARTBEAT') {
    storeInRingBuffer(seq, packet);
  }

  // 2. Check for Method 2: Tiered Severity (Errors & Critical Audit sent via TCP Fallback)
  const isCritical = packet.level === 'ERROR' || (packet.statusCode && packet.statusCode >= 500) || packet.critical === true;
  if (isCritical) {
    dispatchTcpFallback(packet);
  }

  // 3. Fast-Path UDP Send (Zero-Wait)
  try {
    const buffer = Buffer.from(JSON.stringify(packet));
    const socket = getSocket();

    socket.send(buffer, 0, buffer.length, UDP_PORT, UDP_HOST, (err) => {
      if (err) {
        // If UDP send failed (e.g. ENOBUFS), trigger TCP Fallback automatically
        dispatchTcpFallback(packet);
      }
    });
  } catch {
    dispatchTcpFallback(packet);
  }

  return seq;
}

// Heartbeat Timer Management
let heartbeatTimer: NodeJS.Timeout | null = null;

/**
 * Starts automatic Heartbeat signal transmission every 5 seconds (5000 ms)
 */
export function startHeartbeat(intervalMs = 5000): void {
  if (heartbeatTimer) return;

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
}

/**
 * Stops automatic Heartbeat signal
 */
export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Closes the UDP client socket gracefully
 */
export function closeUdpClient(): Promise<void> {
  stopHeartbeat();
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
