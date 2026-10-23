import dgram from 'dgram';

// UDP Target Configuration
const UDP_HOST = process.env.UDP_HOST || '127.0.0.1';
const UDP_PORT = parseInt(process.env.UDP_PORT || '5001', 10);

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
}

// Global auto-increment sequence ID
let currentSequenceId = 1;

// UDP Client Socket Singleton
let udpSocket: dgram.Socket | null = null;

function getSocket(): dgram.Socket {
  if (!udpSocket) {
    udpSocket = dgram.createSocket('udp4');
    udpSocket.on('error', (err) => {
      // Non-blocking fire-and-forget: catch and log without interrupting main thread
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

/**
 * Sends a Zero-Wait (Fire-and-Forget) Telemetry log packet via UDP
 */
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

  try {
    const buffer = Buffer.from(JSON.stringify(packet));
    const socket = getSocket();

    // Fire and forget: completely non-blocking, empty callback
    socket.send(buffer, 0, buffer.length, UDP_PORT, UDP_HOST, (err) => {
      if (err) {
        // Ignored to guarantee Zero-Wait execution in high concurrency
      }
    });
  } catch {
    // Non-blocking safety net
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

  // Send initial heartbeat immediately
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

  // Unref timer so it doesn't prevent Node process exit when stopping
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
