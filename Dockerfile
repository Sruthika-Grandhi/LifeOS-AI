# ==========================================
# LifeOS AI Multi-stage Production Dockerfile
# ==========================================

# --- Stage 1: Dependency builder ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency files
COPY package*.json ./

# Install packages
RUN npm ci --only=production

# --- Stage 2: Runtime image ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=9008

# Copy node modules and package configs from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Copy codebase elements
COPY server.js database.js ai-engine.js ./
COPY public/ ./public/

# Run with non-root security user
USER node

# Expose server listener port
EXPOSE 9008

# Health check setup using alpine's default wget
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9008/health || exit 1

# Launch Express server
CMD ["node", "server.js"]
