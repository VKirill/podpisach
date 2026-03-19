# === DEV ===
FROM node:20-alpine AS dev

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/bot/package.json apps/bot/
COPY packages/shared/package.json packages/shared/

# Copy Prisma schema (needed for prisma generate)
COPY prisma/ prisma/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# === BUILD ===
FROM dev AS build

RUN pnpm turbo build --filter=web

# === PRODUCTION ===
FROM node:20-alpine AS production

# postgresql-client for health checks
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy Nuxt output (self-contained SSR bundle)
COPY --from=build /app/apps/web/.output .output

# Copy Prisma client — pnpm stores it in .pnpm, copy entire node_modules for compatibility
COPY --from=build /app/node_modules node_modules

# Copy Prisma schema, migrations, and config (needed for migrate deploy)
COPY --from=build /app/prisma prisma
COPY --from=build /app/prisma.config.ts prisma.config.ts

# Copy entrypoint and make it executable
COPY apps/web/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
