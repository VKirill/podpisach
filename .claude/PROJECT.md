# ПодписачЪ

Open-source self-hosted система атрибуции подписчиков Telegram и MAX каналов. Определяет источник каждого подписчика по UTM/yclid/gclid.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 |
| Language | TypeScript | 5.x |
| Frontend | Nuxt 3 + Nuxt UI | 3.x |
| Backend API | Nitro (server routes) | встроен в Nuxt |
| Telegram Bot | grammY (отдельный процесс) | latest |
| MAX Bot | REST API (platform-api.max.ru) | — |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16 |
| Monorepo | Turborepo + pnpm | latest |
| Deploy | Docker Compose | 3.8 |

## Architecture

Монорепо Turborepo: `apps/web` (Nuxt 3 — фронт + API), `apps/bot` (grammY + MAX + Correlator), `packages/shared` (типы, валидация). Единая Prisma-схема в `prisma/`. Три Docker-контейнера: app (:3000), bot (:3001, только docker-сеть), postgres (:5432). Bot и App общаются через внутренний HTTP API с shared secret.

```
apps/
├── web/          # Nuxt 3: SSR + Nitro API + Setup Wizard
│   ├── components/   # Vue-компоненты по разделам
│   ├── composables/  # useAuth, useChannels, useStats...
│   ├── pages/        # Файловая маршрутизация Nuxt
│   └── server/       # Nitro API routes + middleware
├── bot/          # grammY + MAX API + Correlator + Internal API
│   └── src/
│       ├── telegram/     # grammY bot + handlers
│       ├── max/          # MAX REST client + poller
│       ├── attribution/  # Correlator (TG exact, MAX probabilistic)
│       └── jobs/         # Cron: linkCleanup, conversionRetry
packages/
└── shared/       # Общие типы, константы, Zod-схемы
prisma/           # Единая схема + миграции + seed
```

## Commands

```bash
pnpm install            # Установка зависимостей
pnpm build              # Сборка (turbo)
pnpm dev                # Dev-сервер (turbo)
pnpm lint               # ESLint
pnpm typecheck          # tsc --noEmit
npx prisma migrate dev  # Миграции (dev)
npx prisma migrate deploy  # Миграции (prod)
npx prisma db seed      # Сид дефолтных настроек
docker compose up -d --build  # Запуск продакшн
docker compose -f docker-compose.yml -f docker-compose.dev.yml up  # Dev
```

## Deploy

- Method: Docker Compose → `docker compose up -d --build`
- Backup: `./scripts/backup.sh` | Update: `./scripts/update.sh`
- ENV: `DATABASE_URL`, `POSTGRES_PASSWORD` (обязательные); `PORT`, `APP_URL` (опционально)
- Токены ботов, интеграции — в БД через UI, НЕ в .env

## Rules

- Все секреты (bot tokens, OAuth) зашифрованы AES-256 в БД, НЕ в .env
- Prisma: всегда `include`/`select`, никогда lazy loading → избегай N+1
- Invite-ссылки: агрессивный TTL + revoke сразу после подписки (лимит TG API)
- Zod-валидация ВСЕХ входящих данных (UTM, track, API)
- Компоненты PascalCase, composables — `use*.ts`, API routes — `*.get.ts`/`*.post.ts`
- Bot ↔ App: внутренний API с `Authorization: Bearer <internalApiSecret>`
- `attributionConfidence`: 1.0 для TG (invite_link), 0.7-0.85 для MAX (корреляция)
