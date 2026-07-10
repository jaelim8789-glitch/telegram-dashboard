# Multi-stage build using Next.js's standalone output (next.config.ts) so the final
# image ships a minimal self-contained server instead of the full node_modules tree.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read at
# container runtime.
#
# Build-time overrides (all optional — defaults work for same-origin nginx proxy):
#   NEXT_PUBLIC_API_BASE_URL — set to "https://api.telemon.online" when frontend is
#     served from a different origin than the backend.
#   NEXT_PUBLIC_SITE_URL    — public marketing domain for cross-domain links.
#   NEXT_PUBLIC_APP_URL     — application dashboard domain for cross-domain links.
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
