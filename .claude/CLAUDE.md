# ПодписачЪ

Self-hosted атрибуция подписчиков Telegram/MAX каналов.

## Stack

Nuxt 3 + Nuxt UI, grammY, Prisma, PostgreSQL 16, Turborepo, Docker Compose, TypeScript.

## Commands

```bash
pnpm install              # Зависимости
pnpm build                # Сборка (turbo)
pnpm dev                  # Dev-сервер
pnpm lint                 # ESLint
pnpm typecheck            # tsc --noEmit
npx prisma migrate dev    # Миграции dev
npx prisma generate       # Генерация клиента
docker compose up -d --build  # Продакшн
```

## Architecture

Монорепо: `apps/web` (Nuxt 3 SSR + Nitro API), `apps/bot` (grammY + MAX + Correlator), `packages/shared` (типы, Zod). Три Docker-контейнера. Bot и App — отдельные процессы, общаются через internal HTTP API + общую PostgreSQL.

## Rules

- Prisma: ВСЕГДА `include`/`select`, НИКОГДА lazy loading
- Zod-валидация всех входящих данных (UTM, track, API requests)
- Bot tokens зашифрованы AES-256 в БД, НЕ в .env файлах
- Invite-ссылки: revoke сразу после подписки, TTL для автоссылок
- Компоненты: PascalCase. Composables: `use*.ts`. API: `*.get.ts`/`*.post.ts`
- Internal API (bot ↔ app): `Authorization: Bearer <internalApiSecret>`
- `attributionConfidence`: 1.0 TG (exact), 0.7-0.85 MAX (probabilistic)
- Никогда `$queryRawUnsafe` — только Prisma ORM или `$queryRaw` с параметрами
- Файлы до 300 строк — декомпозировать при превышении
- Settings — singleton (id=1), проверяй `setupCompleted` для редиректа на wizard

## Gotchas

- TG Bot API лимитирует invite-ссылки на канал (~1000 активных) — агрессивный TTL + revoke
- MAX не имеет invite_link в событиях — корреляция по fingerprint/IP + временное окно ±60 сек
- Bot-контейнер ждёт токен через UI, не стартует polling без него
- `docker compose down -v` УДАЛИТ все данные — предупреждай пользователя

## Testing

Vitest. Приоритет: correlator, UTM-парсинг, link manager. >80% покрытие критичных модулей.

## Deploy

Docker Compose: `docker compose up -d --build`. Миграции автоматически в entrypoint.

## Docs & Agents

- `PROJECT.md` — стек, архитектура, ENV, команды
- `.claude/rules/` — правила по модулям
- `.claude/agents/` — coder, reviewer, debugger, planner, dba, researcher
