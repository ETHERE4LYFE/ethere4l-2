# =========================================================
# ETHERE4L Backend — Production Dockerfile
# =========================================================
# Node 20 Alpine | PostgreSQL (Prisma) | Non-root user
# =========================================================

# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching)
COPY package.json package-lock.json ./

# Install all dependencies (including dev tools for prisma cli)
# ignoring scripts initially to avoid pre-build failures, then we run generate explicitly
RUN npm ci --ignore-scripts=false

# Copy prisma schema
COPY prisma/ ./prisma/

# Generate prisma client
RUN npx prisma generate

# ---- Production stage ----
FROM node:20-alpine

# Security: metadata
LABEL maintainer="ethere4lyfe@gmail.com"
LABEL description="ETHERE4L Backend - Production"

WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs

# Copy built node_modules and prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy application source
COPY package.json ./
COPY server.js ./
COPY src/ ./src/
COPY config/ ./config/

# Set ownership to node user (non-root)
RUN chown -R node:node /app

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "server.js"]
