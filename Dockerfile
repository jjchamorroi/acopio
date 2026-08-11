# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps — dependencias, en su propia capa para que no se reinstalen en cada
# cambio de código (solo se invalida si cambia package.json o el lockfile).
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------------------------------------------------------------------------
# dev — para trabajar con recarga en caliente dentro de Docker.
#       docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# ---------------------------------------------------------------------------
FROM node:22-alpine AS dev
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "dev", "-H", "0.0.0.0"]

# ---------------------------------------------------------------------------
# builder
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# runner — imagen final de producción. El build "standalone" trae solo las
# dependencias que el código realmente importa (~120 MB en vez de ~1 GB).
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Para poder aplicar el esquema desde dentro del contenedor si hace falta:
#   docker compose exec web node scripts/run-sql.mjs db/schema.sql
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
