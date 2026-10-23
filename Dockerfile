# ==============================================================================
# Production Dockerfile for Warehouse Management System (WMS) & Telemetry
# Lightweight, high-performance Node 20 Alpine image
# ==============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root dependencies and configurations
COPY package*.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma

# Install all dependencies with network retry tolerance
RUN npm ci --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=60000

# Copy backend source code and compile
COPY src ./src
RUN npx prisma generate
RUN npx tsc

# ------------------------------------------------------------------------------
# Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV UDP_PORT=5001

# Add curl for container health check
RUN apk add --no-cache curl

# Install production dependencies only
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --omit=dev --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=60000

# Copy compiled backend dist and prisma client artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated

# Copy public static assets & built React TSX web application
COPY public ./public

# Copy entrypoint script and ensure POSIX line endings
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose HTTP API & Dashboard (5000/tcp) and UDP Log Aggregator (5001/udp)
EXPOSE 5000 5001/udp

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
