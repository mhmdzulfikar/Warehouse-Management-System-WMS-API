import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { sendUdpTelemetry } from '../utils/udpLogger';

/**
 * Express Middleware for Dual-Track Telemetry
 * Intercepts every incoming HTTP request and dispatches execution metrics (latency, status, endpoint)
 * via UDP socket fire-and-forget without blocking the Event Loop or slowing client responses.
 */
export const telemetryMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = performance.now();

  // Attach listener to response finish event (triggered when response headers/body are sent)
  res.on('finish', () => {
    try {
      const endTime = performance.now();
      const latencyMs = Math.round((endTime - startTime) * 100) / 100;

      // Extract User ID if authenticated
      const user = (req as any).user;
      const userId = user?.userId || user?.id ? Number(user.userId || user.id) : undefined;

      // Determine Log Level based on HTTP status code
      let level: 'INFO' | 'WARN' | 'ERROR' = 'INFO';
      if (res.statusCode >= 500) {
        level = 'ERROR';
      } else if (res.statusCode >= 400) {
        level = 'WARN';
      }

      // Metadata with safe parameters
      const metadata: Record<string, any> = {
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      };

      if (req.query && Object.keys(req.query).length > 0) {
        metadata.query = req.query;
      }

      // Record request body for POST/PUT/PATCH (will be masked automatically)
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        metadata.body = req.body;
      }

      const endpoint = req.originalUrl || req.url;
      const message = `${req.method} ${endpoint} - ${res.statusCode} (${latencyMs}ms)`;

      // Dispatch packet over UDP Zero-Wait
      sendUdpTelemetry({
        type: 'LOG',
        level,
        method: req.method,
        endpoint,
        statusCode: res.statusCode,
        latencyMs,
        userId,
        message,
        metadata,
        timestamp: Date.now(),
      });
    } catch {
      // Never crash or interfere with completed response
    }
  });

  next();
};
