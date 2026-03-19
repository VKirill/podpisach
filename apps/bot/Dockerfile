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

EXPOSE 3001

# === BUILD ===
FROM dev AS build

RUN pnpm turbo build --filter=bot

# === PRODUCTION ===
FROM node:20-alpine AS production

# postgresql-client provides pg_isready for entrypoint health checks
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy compiled bot
COPY --from=build /app/apps/bot/dist dist

# Copy all node_modules (includes Prisma client and all runtime dependencies)
COPY --from=build /app/node_modules node_modules

# Copy Prisma schema (bot reads schema at runtime)
COPY --from=build /app/prisma prisma

# Copy entrypoint and make it executable
COPY apps/bot/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
