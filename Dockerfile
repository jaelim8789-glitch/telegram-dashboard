# Multi-stage build using Next.js's standalone output (next.config.ts) so the final
# image ships a minimal self-contained server instead of the full node_modules tree.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, not read at
# container runtime.
#
# Build-time overrides (all optional — defaults work for same-origin nginx proxy):
#   NEXT_PUBLIC_API_BASE_URL — set to "https://api.telemon.online" when frontend is
#     served from a different origin than the backend.
#   NEXT_PUBLIC_SITE_URL    — public marketing domain for cross-domain links.
#   NEXT_PUBLIC_APP_URL     — application dashboard domain for cross-domain links.
#   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME — bot @username backing the Telegram Login
#     Widget on /admin/login; must match the bot behind TELEGRAM_BOT_TOKEN in the
#     backend's .env and be registered via @BotFather /setdomain for this origin.
#     Empty means the widget silently renders nothing.
ARG NEXT_PUBLIC_API_BASE_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_APP_URL=""
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=""
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build --silent 2>&1

# Post-build verification: check that App Router produced at least one route.
# Zero routes means /app or /backend leaked into the build context and
# shadowed src/app — the build exits 0 but every page 404s.
RUN node scripts/verify-build.js

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]