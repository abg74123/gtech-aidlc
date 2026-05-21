# =============================================================================
# Autoflow API — Multi-stage Dockerfile
# =============================================================================

# --- Stage 1: Build ---
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps --ignore-scripts

# Copy source code
COPY tsconfig.base.json nx.json ./
COPY apps/api ./apps/api
COPY libs ./libs

# Generate Prisma client (with dummy URL — only needed for type generation, not connection)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build the API
RUN npx nx build api --configuration=production

# Create @autoflow module stubs for production
RUN mkdir -p /tmp/autoflow_modules/@autoflow && \
    for lib in shared-errors shared-auth shared-prisma shared-types shared-utils reports; do \
      if [ -d "dist/apps/api/libs/$lib/src" ]; then \
        mkdir -p "/tmp/autoflow_modules/@autoflow/$lib"; \
        echo "{\"name\":\"@autoflow/$lib\",\"main\":\"/app/dist/apps/api/libs/$lib/src/index.js\"}" > "/tmp/autoflow_modules/@autoflow/$lib/package.json"; \
      fi; \
    done && \
    for domain in warehouse master-data transactions; do \
      for sub in feature data-access ui; do \
        if [ -d "dist/apps/api/libs/${domain}/${sub}/src" ]; then \
          mkdir -p "/tmp/autoflow_modules/@autoflow/${domain}-${sub}"; \
          echo "{\"name\":\"@autoflow/${domain}-${sub}\",\"main\":\"/app/dist/apps/api/libs/${domain}/${sub}/src/index.js\"}" > "/tmp/autoflow_modules/@autoflow/${domain}-${sub}/package.json"; \
        fi; \
      done; \
    done

# --- Stage 2: Production ---
FROM node:24-alpine AS production

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# Copy Prisma generated client from builder (avoid re-generating in production)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy built application
COPY --from=builder /app/dist/apps/api ./dist/apps/api

# Copy @autoflow module stubs from builder
COPY --from=builder /tmp/autoflow_modules/@autoflow ./node_modules/@autoflow

# Copy Prisma schema, config, and migrations for deploy
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install prisma CLI for migrations (lightweight, then clean up)
RUN npx prisma --version || npm install prisma --no-save

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

EXPOSE 3000

# Run migrations then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/apps/api/apps/api/src/main.js"]
