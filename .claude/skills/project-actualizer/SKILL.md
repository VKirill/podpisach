---
name: project-actualizer
description: Методология исследования проектов и создания .claude/ конфигурации
agents:
  - actualizer
user-invocable: false
---

# Project Actualizer — методология актуализации

Фреймворк мышления для исследования проектов и создания `.claude/` конфигурации.
Не жёсткий алгоритм — принципы и таблицы для принятия решений.

## 1. Как определить стек

### По корневым артефактам

| Файл | Стек | Runtime |
|------|------|---------|
| `package.json` | JavaScript/TypeScript | Node.js |
| `tsconfig.json` | TypeScript | Node.js |
| `pyproject.toml` / `setup.py` / `requirements.txt` | Python | Python |
| `go.mod` | Go | Go |
| `Cargo.toml` | Rust | Rust |
| `Gemfile` | Ruby | Ruby |
| `composer.json` | PHP | PHP |
| `pom.xml` / `build.gradle` | Java | JVM |
| `*.csproj` / `*.sln` | C# | .NET |
| `mix.exs` | Elixir | BEAM |
| `deno.json` | TypeScript | Deno |
| `bun.lockb` | TypeScript | Bun |

### По фреймворку (внутри package.json deps)

| Зависимость | Тип проекта |
|-------------|-------------|
| `next` | nextjs-app |
| `nuxt` | nuxt-app |
| `@sveltejs/kit` | sveltekit-app |
| `grammy` / `telegraf` / `node-telegram-bot-api` | telegram-bot |
| `fastify` / `express` / `hono` / `koa` | web-api |
| `@nestjs/core` | nestjs-app |
| `react` (without next) | react-app |
| `vue` (without nuxt) | vue-app |
| `svelte` (without kit) | svelte-app |
| `electron` | desktop-app |
| `react-native` / `expo` | mobile-app |

### По структуре директорий

| Паттерн | Архитектура |
|---------|-------------|
| `src/app/` `src/entities/` `src/features/` `src/shared/` | FSD (Feature-Sliced Design) |
| `src/controllers/` `src/models/` `src/views/` | MVC |
| `src/domain/` `src/application/` `src/infrastructure/` | Clean Architecture / DDD |
| `src/routes/` `src/middleware/` `src/handlers/` | Express/Fastify API |
| `src/commands/` `src/events/` `src/listeners/` | Event-driven |
| `packages/` or `apps/` at root | Monorepo |

## 2. Что читать в проекте

### Обязательно (5-7 файлов)
- Корневой конфиг стека (package.json, Cargo.toml, go.mod...)
- Конфиг компилятора (tsconfig.json, rustfmt.toml, .golangci.yml...)
- Линтер/форматтер (.eslintrc, .prettierrc, ruff.toml...)
- CI конфиг (.github/workflows/*.yml, .gitlab-ci.yml, Jenkinsfile)
- Docker (Dockerfile, docker-compose.yml)
- README.md / PROJECT.md (если есть)

### Runtime & Deployment (1-2 файла)
- `.env.example` / `.env.sample` / `.env.template` — ENV schema
- `ecosystem.config.js` / `ecosystem.config.cjs` — PM2 конфигурация
- `docker-compose.yml` — сервисы и зависимости
- `Procfile` / `fly.toml` / `vercel.json` / `serverless.yml` — cloud deploy
- `.github/workflows/*.yml` — CI/CD pipeline

### Database & Schema (1-3 файла)
- ORM schema по матрице (см. секцию 3):
  - Prisma → `prisma/schema.prisma`
  - Django → `*/models.py`
  - Rails → `db/schema.rb`
  - TypeORM/Drizzle/MikroORM → `src/**/entities/*.ts` или `src/**/schema.ts`
- Последние 2-3 миграции — для понимания эволюции схемы

### По необходимости (2-3 файла)
- Ключевой модуль из src/ — паттерны кода
- Тест-файл — фреймворк и паттерны тестирования

### НЕ читать
- Все файлы в src/ — достаточно 2-3 репрезентативных
- Lock-файлы (package-lock.json, Cargo.lock) — слишком большие
- Сгенерированный код (dist/, build/, .next/)
- Бинарные файлы, изображения

## 3. Как решать что нужно

### CLAUDE.md — структура

Обязательные секции (в этом порядке):
1. `## Stack` — одна строка ключевых технологий
2. `## Commands` — build, test, lint, dev, deploy
3. `## Rules` — 3-7 критичных правил (императивные предложения)
4. `## Docs` — ссылки на .claude/ артефакты

Опциональные секции (между Commands и Rules):
- `## Deploy` — только если есть процедура деплоя
- `## Gotchas` — только если есть неочевидные поведения (max 3-5)
- `## Testing` — только если есть специфические паттерны тестов

**Каждая строка зарабатывает место.** Нет generic описаний. Нет копирования README.

### Deployment method mapping

| Артефакт найден | Метод | PROJECT.md текст |
|----------------|-------|-----------------|
| `ecosystem.config.*` | PM2 | `Method: PM2` + `Deploy: pm2 restart ecosystem.config.cjs` |
| `docker-compose.yml` | Docker Compose | `Method: Docker Compose` + `Deploy: docker compose up -d --build` |
| `Dockerfile` (без compose) | Docker | `Method: Docker` + `Deploy: docker build -t app . && docker run -d app` |
| `Procfile` | Heroku/Dokku | `Method: Heroku` + `Deploy: git push heroku main` |
| `fly.toml` | Fly.io | `Method: Fly.io` + `Deploy: fly deploy` |
| `vercel.json` / `.vercel/` | Vercel | `Method: Vercel` + `Deploy: vercel --prod` |
| `serverless.yml` | Serverless | `Method: Serverless Framework` + `Deploy: sls deploy` |
| `*.service` | Systemd | `Method: Systemd` + `Deploy: systemctl restart <name>` |
| Ничего | Manual | `Method: Manual` + `Deploy: node dist/index.js` |

### Environment extraction

**Приоритет источников:**
1. `.env.example` / `.env.sample` → парси напрямую, каждая строка = переменная
2. Grep по коду: `process.env.VAR` (Node), `os.environ["VAR"]` (Python), `os.Getenv("VAR")` (Go)
3. Docker compose → `environment:` секция каждого сервиса

**Формат вывода:**
```markdown
## Environment
| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | Yes | Redis connection (BullMQ) |
| TELEGRAM_BOT_TOKEN | Yes | Telegram bot token |
| S3_BUCKET | No | S3 bucket for file storage |
```

**ПРАВИЛО**: никогда не включай значения секретов. Только имена переменных.

### External deps extraction

**Источники:**
- `docker-compose.yml` → каждый service кроме основного app = external dep
- ENV patterns: `DATABASE_URL` / `PG_*` → PostgreSQL, `REDIS_*` → Redis, `S3_*` / `AWS_*` → S3/AWS, `SMTP_*` → Email service, `TELEGRAM_*` → Telegram API, `STRIPE_*` → Stripe
- `package.json` deps: `pg` / `@prisma/client` → PostgreSQL, `ioredis` / `redis` → Redis, `@aws-sdk/*` → AWS, `bullmq` → Redis (BullMQ)

**Формат вывода:**
```markdown
## External Dependencies
- PostgreSQL 17+ (required) — main database
- Redis 7+ (required) — BullMQ job queue
- S3/MinIO (optional) — file storage
- Telegram Bot API (required) — bot interaction
```

### ORM → как читать schema

| ORM/Framework | Где schema | Как читать |
|---------------|-----------|-----------|
| Prisma | `prisma/schema.prisma` | Read файл |
| Laravel/Eloquent | `database/migrations/*.php` | Glob + Read last 3 |
| Django | `*/models.py` | Glob + Read |
| Rails/ActiveRecord | `db/schema.rb` | Read файл |
| TypeORM | `src/**/entities/*.ts` | Glob + Read |
| Drizzle | `src/**/schema.ts` / `drizzle/` | Glob + Read |
| Sequelize | `src/**/models/*.js` | Glob + Read |
| Knex | `migrations/*.js` + `knexfile.js` | Glob + Read last 3 |
| MikroORM | `src/**/entities/*.ts` | Glob + Read |
| GORM (Go) | `**/models/*.go` | Grep `type.*struct` |
| SQLAlchemy | `**/models.py` | Grep `class.*Base` |

### Command verification

Перед записью любой команды в Commands — проверь:
- **Node.js**: прочитай `scripts` из `package.json` — бери ТОЛЬКО оттуда
- **PHP**: `php artisan list --raw | head -30`
- **Python**: Read `pyproject.toml` → `[tool.taskipy.tasks]` / `Makefile`
- **Go/Rust**: Read `Makefile` / `Cargo.toml`
- **Общее**: `<cmd> --help | head -5`

Выдуманные команды — критическая ошибка для downstream agents.

### Rules — дерево решений

```
Потенциальное правило →
  Детерминированная проверка? → Hook (не rule)
  Выводимо из кода? → Не добавлять
  Покрыто глобальным скиллом? → Не добавлять
  Доменное знание проекта? → STRUCTURE rule
  Ограничение модели? → SCAFFOLD rule (с пометкой expiry)
```

Каждый rule-файл имеет `paths:` frontmatter для scoped loading:
```yaml
---
paths:
  - "src/api/**"
  - "src/routes/**"
---
```

Правило `alwaysApply: true` — только для глобальных правил проекта (не привязанных к пути).

### Skills — маппинг стек → скиллы

| Стек | Скиллы |
|------|--------|
| TypeScript | typescript-pro, typescript-expert |
| Python | python-pro, fastapi-pro (если FastAPI) |
| Go | golang-pro |
| Rust | rust-pro |
| React/Next.js | frontend-developer, react-best-practices, react-patterns |
| Vue/Nuxt | vue-developer |
| Svelte | svelte-developer |
| NestJS | nestjs-expert |
| Telegram bot | telegram-bot-builder |
| SQL/DB | postgresql, prisma-expert (если Prisma) |
| Testing | testing-patterns |
| Docker | docker-expert |
| Backend API | nodejs-backend-patterns, api-patterns |
| BullMQ/Workers | bullmq-specialist |
| Security | backend-security-coder |

**Правило**: только скиллы с КОНКРЕТНОЙ пользой для ЭТОГО проекта. Fewer focused > many generic.

### Agents — матрица выбора

| Агент | Когда включать | maxTurns |
|-------|----------------|----------|
| coder | ВСЕГДА | 30 |
| reviewer | ВСЕГДА | 15 |
| debugger | ВСЕГДА | 20 |
| planner | Сложный проект (monorepo, >50 файлов, >3 FSD-слоя) | 20 |
| dba | Есть база данных | 20 |
| verifier | Есть тесты или verify_steps | 10 |
| refiner | Сложный проект | 10 |

Каждый агент получает `## Контекст проекта` с реальными данными:
- Ключевые файлы и их назначение
- Архитектурные паттерны проекта
- Таблицы стека, зависимостей
- Специфичные gotchas

### Hooks — только детерминированные

| Стек | Event | Matcher | Command |
|------|-------|---------|---------|
| TypeScript | PostToolUse | Edit\|Write | `FILES=$(git diff --name-only HEAD 2>/dev/null \| grep -E '\\.(ts\|tsx)$') && [ -n "$FILES" ] && npx tsc --noEmit --pretty 2>&1 \| head -50 \|\| true` |
| Python | PostToolUse | Edit\|Write | `FILES=$(git diff --name-only HEAD 2>/dev/null \| grep -E '\\.py$') && [ -n "$FILES" ] && ruff check --fix $FILES \|\| true` |
| Go | PostToolUse | Edit\|Write | `go vet ./...` |
| Rust | PostToolUse | Edit\|Write | `cargo check 2>&1 \| head -50` |
| ESLint | PostToolUse | Edit\|Write | `FILES=$(git diff --name-only --diff-filter=AM HEAD 2>/dev/null \| grep -E '\\.(ts\|tsx\|js\|jsx)$' \| head -5) && [ -n "$FILES" ] && npx eslint --fix $FILES 2>&1 \| tail -20 \|\| true` |

**Правила hooks**:
- **НИКОГДА**: AI-проверки в hooks. Только lint/typecheck/format
- **Фильтруй по расширению**: не запускай tsc/eslint при правке .md/.json/.yaml файлов
- **Команды через `|| true`**: hook не должен блокировать работу агента при информационных ошибках

### settings.json — MERGE протокол

1. `Read(".claude/settings.json")` — прочитай существующий
2. `JSON.parse()` — распарси
3. Сохрани: `permissions`, `allowedTools`, существующие hooks в `hooks`
4. Добавь новые hooks из решений
5. `Write` — запиши обновлённый JSON

**НИКОГДА не перезаписывай settings.json целиком без merge.**

### Skill References

References (`{skill}/references/REFERENCE.md`) генерируются **ОТДЕЛЬНЫМ процессом** — агентом `reference-generator` после основной актуализации. Actualizer НЕ должен тратить время на context7 вызовы.

**Что делает actualizer**: копирует skills, привязывает к агентам.
**Что делает reference-generator**: для каждого library-backed skill → context7 resolve + query → Write REFERENCE.md.

### Правило: нет orphan skills

Каждый скопированный в `.claude/skills/` skill ОБЯЗАН быть в `skills:` хотя бы одного агента. Если skill не нужен ни одному агенту — не копируй его. Orphan skills — мусор и шум.

## 4. Шаблоны файлов

### PROJECT.md

```markdown
# {Project Name}

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Language | TypeScript 5.x |
| Framework | Next.js 15 |
| Database | PostgreSQL 17 |
| ORM | Prisma 5.x |

## URLs

- Production: https://...
- API: https://...

## Database

- Type: PostgreSQL
- Name: {db_name}
- Key tables: users, orders, ...

## Architecture

```
src/
├── app/          # Next.js app router
├── components/   # Shared UI components
├── lib/          # Business logic
└── api/          # API routes
```

## Commands

```bash
npm run build     # Production build
npm run dev       # Dev server
npm run test      # Run tests
npm run lint      # ESLint check
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | No | Redis for caching/queues |
| API_KEY | Yes | External API authentication |

## External Dependencies

- PostgreSQL 17+ (required) — main database
- Redis 7+ (optional) — caching, job queues

## Deployment

- Method: PM2
- Deploy: `pm2 restart ecosystem.config.cjs`
- Health: `curl http://localhost:3000/health`

## Key Modules

- `src/lib/core.ts` — business logic core, imported by 12 modules
- `src/api/routes.ts` — API entry point, depends on core + db
- `src/workers/` — background jobs, depends on core + redis

## Conventions

- {Convention 1}
- {Convention 2}
```

### Rule file

```markdown
---
paths:
  - "src/api/**"
  - "src/routes/**"
---

# API Rules

- Never return raw database errors to clients
- Always validate request body with zod schema before processing
- Use consistent error response format: { error: string, code: number }
```

### Agent frontmatter

```yaml
---
name: coder
description: Пишет код для {Project} — {краткое описание}
model: inherit
permissionMode: bypassPermissions
maxTurns: 30
memory: project
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
skills:
  - typescript-pro
---
```

## 5. Anti-patterns — чего НИКОГДА не делать

| Anti-pattern | Пример | Почему плохо |
|--------------|--------|-------------|
| Rule = описание | "This project uses React" | Claude видит это в коде |
| CLAUDE.md = README | Копирование архитектуры | Claude читает README сам |
| Пустой контекст | `## Контекст проекта\nTODO` | Лучше без секции |
| AI в hooks | `claude --prompt "check..."` | Дорого, нестабильно |
| Перезапись settings | `Write(settings.json, {...})` | Потеря permissions |
| Чтение всех файлов | `Read(every-file-in-src)` | 10-15 достаточно |
| Generic правила | "Write clean code" | Не enforceable |
| Слишком много rules | >7 rule-файлов | Cognitive overload |

## 6. Критерии качества

### CLAUDE.md
- [ ] Нет generic описаний
- [ ] Все команды проверяемы (реально существуют)
- [ ] Правила ссылаются на rule-файлы
- [ ] Секции в правильном порядке

### Rules
- [ ] Enforceable (можно проверить grep/lint)
- [ ] Не описания кодбейзы
- [ ] `paths:` ссылается на существующие директории
- [ ] 2-5 файлов (не больше 7)

### Agents
- [ ] Body > 25 строк
- [ ] Frontmatter полный (все обязательные поля)
- [ ] `## Контекст проекта` с реальными данными
- [ ] permissionMode: bypassPermissions

### PROJECT.md
- [ ] Stack table с версиями
- [ ] Architecture — ASCII tree реальной структуры
- [ ] Commands — рабочие команды (верифицированы через package.json/Makefile/etc.)
- [ ] Environment — таблица ENV vars (без значений секретов!)
- [ ] External Dependencies — список с версиями и required/optional
- [ ] Deployment — метод + команда + health check
- [ ] Key Modules — blast radius карта (если проект >30 файлов)
- [ ] Conventions — из конфигов, не выдуманные
