# 🛠️ Разработка

Руководство для контрибьюторов.

## Требования

| Инструмент | Версия |
|-----------|--------|
| Node.js | 20+ |
| pnpm | 9+ |
| Docker | 24.0+ |
| Docker Compose | v2.20+ |

```bash
# Установить pnpm (если нет)
npm install -g pnpm
```

---

## Локальная разработка

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/VKirill/podpisach.git
cd podpisach
pnpm install
```

### 2. Запустите базу данных

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

### 3. Настройте переменные окружения

```bash
cp .env.example .env
# Отредактируйте DATABASE_URL если нужно
```

### 4. Примените миграции и запустите

```bash
npx prisma migrate dev
pnpm dev
```

Приложение: `http://localhost:3000`
Bot работает как отдельный процесс — запустите в отдельном терминале:

```bash
pnpm --filter bot dev
```

---

## Структура проекта

```
podpisach/
├── apps/
│   ├── web/          # Nuxt 4 — фронтенд + Nitro API
│   └── bot/          # grammY + MAX-бот
├── packages/
│   └── shared/       # Общие типы, Zod-схемы, константы
├── prisma/
│   ├── schema.prisma # Схема БД
│   └── migrations/   # Автогенерируемые миграции
└── scripts/          # install.sh, update.sh, backup.sh
```

### apps/web

- `pages/` — файловая маршрутизация Nuxt
- `components/` — Vue-компоненты (PascalCase)
- `composables/` — `use*.ts` — reactive-логика
- `server/api/` — Nitro API routes (`*.get.ts`, `*.post.ts`, ...)
- `server/utils/` — prisma singleton, session helpers, Zod-схемы

### apps/bot

- `src/telegram/` — grammY handlers, link service
- `src/max/` — MAX API client, poller
- `src/attribution/` — correlator, matchers
- `src/jobs/` — cron: TTL cleanup, conversion retry
- `src/api/internal.ts` — HTTP-сервер :3001 для связи с app

---

## Миграции базы данных

```bash
# Создать новую миграцию
npx prisma migrate dev --name add_feature_name

# Применить существующие миграции (CI/продакшн)
npx prisma migrate deploy

# Сбросить БД (только разработка!)
npx prisma migrate reset

# Посмотреть схему в браузере
npx prisma studio
```

После изменения `schema.prisma` всегда запускайте `npx prisma generate`.

---

## Тесты

```bash
# Все тесты
pnpm test

# Только unit-тесты (без Docker)
pnpm --filter web test
pnpm --filter bot test

# С покрытием
pnpm test --coverage
```

Тесты — Vitest. Приоритет покрытия:
- `src/attribution/correlator.ts` — корреляция MAX
- `server/utils/validators.ts` — UTM-парсинг
- `src/telegram/services/linkService.ts` — Link Manager

---

## Code style и конвенции

**TypeScript:**
- Strict mode включён — никаких `any` без крайней необходимости
- Zod-валидация на всех API boundaries

**Prisma:**
- Всегда используйте `include` / `select` — lazy loading запрещён
- DB-запросы только в `server/api/` — не в компонентах и composables

**Именование:**
- Компоненты: `PascalCase.vue`
- Composables: `useCamelCase.ts`
- API routes: `index.get.ts`, `index.post.ts`, `[id].patch.ts`

**FSD-порядок импортов (bot):** `utils → attribution → telegram → jobs`

---

## Pull Request

1. Создайте ветку: `git checkout -b feat/my-feature`
2. Убедитесь, что тесты проходят: `pnpm test`
3. Проверьте типы: `pnpm typecheck`
4. Создайте PR с описанием изменений

Все PR проходят CI: lint + typecheck + tests.
