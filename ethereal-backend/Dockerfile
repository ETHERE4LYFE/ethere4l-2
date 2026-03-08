# =========================================================
# ETHERE4L Backend — Production Dockerfile
# =========================================================
# Node 20 Alpine | PostgreSQL (Prisma) | Non-root user
# Includes prisma migrate deploy for production
# =========================================================

# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts=false

COPY prisma/ ./prisma/
RUN npx prisma generate

# ---- Production stage ----
FROM node:20-alpine

LABEL maintainer="ethere4lyfe@gmail.com"
LABEL description="ETHERE4L Backend - Production Hermetic"

# Create unprivileged user/group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Only copy prod dependencies (dramatically reduces size)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts=false

# Copy Prisma binaries generated from the builder stage
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Create logs directory and fix permissions early
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Copy application source
COPY server.js ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Fix permissions for the explicitly copied files
RUN chown -R appuser:appgroup /app

# Enforce Env
ENV NODE_ENV=production
ENV PORT=3000

# Drop to non-root
USER appuser

EXPOSE 3000

# Strict native Node Healthcheck (No curl/wget dependencies)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["node", "-e", "require('http').get('http://localhost:3000/health/live', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"]

# Run migrations before starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
