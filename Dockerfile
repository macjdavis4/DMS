# syntax=docker/dockerfile:1.7
# Multi-stage build → small final image with only what's needed to run.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@10.9.7 --activate && \
    pnpm install --frozen-lockfile=false --prod=false

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@10.9.7 --activate && \
    pnpm prisma generate && \
    # Provide a placeholder DATABASE_URL only for `next build` static analysis
    DATABASE_URL="postgresql://x:x@localhost:5432/x?schema=public" \
    AUTH_SECRET="build-time-placeholder-build-time-placeholder" \
    pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apk add --no-cache libc6-compat tini
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy the standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Storage and backups land here at runtime
RUN mkdir -p /data/storage /data/backups && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
