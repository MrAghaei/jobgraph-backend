FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.0.0

FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo@2.10.5
COPY . .
ARG APP_NAME
RUN turbo prune ${APP_NAME} --docker

FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm dlx prisma generate --schema=packages/database/prisma/schema.prisma
ARG APP_NAME
ENV TURBO_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=${APP_NAME}

FROM base AS runner
RUN apk update && apk add --no-cache openssl
WORKDIR /app
ARG APP_NAME
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs
COPY --from=installer --chown=nestjs:nodejs /app .
ENV APP_START="apps/${APP_NAME}/dist/main.js"
CMD node ${APP_START}
