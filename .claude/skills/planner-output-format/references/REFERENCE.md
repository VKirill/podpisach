# Planner Output — Extended Examples

## Good Plan Example (medium complexity)

```yaml
---
complexity: medium
steps_count: 3
stack: typescript
needs_migration: false
---
```

```markdown
## Plan

Добавить кэширование ответов API через Redis с TTL по типу ресурса.

### Step 1: Cache middleware
- **id**: cache-middleware
- **agent**: coder-backend
- **file**: src/shared/lib/cache/redis-cache.ts
- **content**: |
    Создать middleware `withCache(ttl: number)` для Fastify.
    Ключ: `cache:${req.method}:${req.url}`.
    При cache hit — вернуть JSON из Redis, не вызывая handler.
    При cache miss — вызвать handler, сохранить результат.

    ```ts
    // Текущий код (src/app/server.ts:45):
    app.get('/api/projects', getProjects)
    ```

    Нужно обернуть: `app.get('/api/projects', withCache(300), getProjects)`
- **imports_needed**: `import { redis } from '@/shared/lib/redis'`
- **verify_steps**:
    - Функция `withCache` экспортируется из модуля
    - Принимает TTL в секундах
    - При повторном запросе возвращает кэш (проверить через логи)
- **blocked_by**: []

### Step 2: Apply to read endpoints
- **id**: apply-cache
- **agent**: coder-backend
- **file**: src/app/server.ts
- **content**: |
    Подключить `withCache` к GET-эндпоинтам:
    - `/api/projects` — TTL 300s
    - `/api/projects/:id` — TTL 60s
    - `/api/users/me` — TTL 30s

    НЕ кэшировать: POST, PUT, DELETE, `/api/auth/*`
- **verify_steps**:
    - Все 3 GET-эндпоинта обёрнуты в withCache
    - POST/PUT/DELETE эндпоинты НЕ затронуты
- **blocked_by**: [cache-middleware]

### Step 3: Cache invalidation on mutations
- **id**: invalidation
- **agent**: coder-backend
- **file**: src/features/projects/handlers.ts
- **content**: |
    После успешного POST/PUT/DELETE на `/api/projects`:
    удалить ключи `cache:GET:/api/projects*` через `redis.keys()` + `redis.del()`.

    ```ts
    // После строки ~72 (return reply.send(project)):
    const keys = await redis.keys('cache:GET:/api/projects*')
    if (keys.length) await redis.del(...keys)
    ```
- **verify_steps**:
    - После создания проекта кэш GET /api/projects сбрасывается
    - Паттерн удаления: `cache:GET:/api/projects*`
- **blocked_by**: [apply-cache]
```

## Bad Plan Example (vague, no context)

```markdown
### Step 1: Add caching
- **agent**: coder
- **content**: Add Redis caching to the API
- **verify_steps**: caching works
```

Problems:
- No file specified
- No code_context (coder doesn't know current code)
- No specific TTL, patterns, or key strategy
- Verify is unmeasurable
- Agent is plain `coder` instead of `coder-backend`

## Complexity Guidelines

| Complexity | Steps | Description |
|-----------|-------|-------------|
| low | 1-2 | Single file fix, config change, simple addition |
| medium | 2-4 | Feature with 2-4 files, clear scope |
| high | 4-5 | Cross-cutting feature, multiple modules, integration |

> More than 5 steps = task is too large, split into subtasks.
