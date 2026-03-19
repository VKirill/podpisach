# API Patterns — Project-Specific Reference

<!-- Generated from model knowledge, verify against official docs -->

> Project: ai-pipeline (Node.js TypeScript ESM) | Generated: 2026-03-10

## REST API — Структура эндпоинтов

Паттерн, используемый в `src/http/`:

```typescript
// Resource collection
GET    /api/tasks              // list + filters
GET    /api/tasks/:id          // single item
POST   /api/tasks              // create
PUT    /api/tasks/:id          // full update
PATCH  /api/tasks/:id          // partial update
DELETE /api/tasks/:id          // delete

// Sub-resources
GET    /api/tasks/:id/comments
POST   /api/tasks/:id/comment
GET    /api/tasks/:id/timeline

// Actions (глаголы — исключение для RPC-like операций)
POST   /api/tasks/:id/restart
POST   /api/tasks/:id/feedback
POST   /api/tasks/:id/answer
```

## Response Envelope Pattern

Единый формат ответа для всего проекта:

```typescript
// types/api.ts
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;          // machine-readable: "TASK_NOT_FOUND"
  message: string;       // human-readable
  details?: unknown;     // validation errors, stack (dev only)
}

export interface ResponseMeta {
  total?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}

// Успех
res.json({ success: true, data: task });

// Ошибка
res.status(404).json({
  success: false,
  error: { code: 'TASK_NOT_FOUND', message: 'Task not found' }
});

// Список с пагинацией
res.json({
  success: true,
  data: tasks,
  meta: { total: 243, limit: 20, offset: 0 }
});
```

## HTTP Status Codes — Выбор правильного

```typescript
// 2xx — успех
200 OK              // GET, PUT, PATCH — данные возвращены
201 Created         // POST — ресурс создан (добавить Location header)
202 Accepted        // POST — запрос принят, обрабатывается async
204 No Content      // DELETE — успех без тела ответа

// 4xx — ошибка клиента
400 Bad Request     // невалидные данные, неправильный формат
401 Unauthorized    // нет аутентификации (нет токена)
403 Forbidden       // есть аутентификация, нет прав
404 Not Found       // ресурс не найден
409 Conflict        // конфликт состояния (duplicate, wrong status)
422 Unprocessable   // данные валидны по формату, но бизнес-логика отвергает
429 Too Many Reqs   // rate limit exceeded

// 5xx — ошибка сервера
500 Internal Error  // неожиданная ошибка (не показывать детали клиенту)
503 Unavailable     // сервис временно недоступен (circuit breaker open)
```

## Query Parameters — Фильтрация и пагинация

```typescript
// Паттерн из api-tasks.ts
// GET /api/tasks?status=pending&project=my-app&limit=20&offset=0

interface TasksQuery {
  status?: string;
  project?: string;
  limit?: number;   // default: 20, max: 100
  offset?: number;  // default: 0
  since?: string;   // ISO date for events
}

// Парсинг в handler
function parseQuery(query: Record<string, string>): TasksQuery {
  return {
    status: query.status,
    project: query.project,
    limit: Math.min(Number(query.limit) || 20, 100),
    offset: Number(query.offset) || 0,
    since: query.since,
  };
}

// Cursor-based (предпочтительно для больших datasets)
// GET /api/events?cursor=eyJpZCI6MTIzfQ&limit=20
interface CursorQuery {
  cursor?: string;  // base64 encoded last item id/timestamp
  limit?: number;
}
```

## Error Handling Middleware

```typescript
// http/server.ts — централизованный error handler
import type { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

// Middleware (регистрировать последним)
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { details: err.details }),
      },
    });
    return;
  }

  // Неожиданная ошибка — не раскрывать детали
  logger.error('Unhandled API error', { err, path: req.path });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}

// Использование в handlers
router.get('/api/tasks/:id', async (req, res, next) => {
  try {
    const task = await getTask(req.params.id);
    if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    res.json({ success: true, data: task });
  } catch (err) {
    next(err); // передать в errorHandler
  }
});
```

## Rate Limiting — Token Bucket

```typescript
// Простой in-memory rate limiter (для одного инстанса)
// Для multi-instance — использовать Redis

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

export function createRateLimiter(options: {
  maxTokens: number;       // max burst
  refillRate: number;      // tokens per second
  keyFn: (req: Request) => string;
}) {
  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyFn(req);
    const now = Date.now();
    const entry = store.get(key) ?? { tokens: options.maxTokens, lastRefill: now };

    // Пополнить токены
    const elapsed = (now - entry.lastRefill) / 1000;
    entry.tokens = Math.min(
      options.maxTokens,
      entry.tokens + elapsed * options.refillRate
    );
    entry.lastRefill = now;

    if (entry.tokens < 1) {
      res.set('Retry-After', String(Math.ceil(1 / options.refillRate)));
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      });
      return;
    }

    entry.tokens -= 1;
    store.set(key, entry);
    res.set('X-RateLimit-Remaining', String(Math.floor(entry.tokens)));
    next();
  };
}

// Использование
app.use('/api/', createRateLimiter({
  maxTokens: 100,
  refillRate: 10, // 10 req/sec
  keyFn: (req) => req.ip ?? 'unknown',
}));
```

## API Versioning Strategies

```typescript
// 1. URI Versioning (рекомендуется для публичных API)
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// 2. Header Versioning (для внутренних API)
app.use((req, res, next) => {
  const version = req.headers['api-version'] ?? 'v1';
  req.apiVersion = version;
  next();
});

// 3. Query Parameter (fallback)
// GET /api/tasks?version=2

// Для этого проекта (внутренний API без версионирования):
// Используй backward-compatible изменения + deprecation headers
res.set('Deprecation', 'true');
res.set('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
```

## Auth Patterns — JWT + API Keys

```typescript
// JWT middleware
import { verify } from 'jsonwebtoken';

export function jwtAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing token');
  }

  try {
    const token = header.slice(7);
    const payload = verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
}

// API Key middleware (для внутренних сервисов)
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] ?? req.query.api_key;
  if (!key || !validApiKeys.has(String(key))) {
    throw new ApiError(401, 'INVALID_API_KEY', 'Invalid API key');
  }
  next();
}
```

## Health Check Pattern

```typescript
// http/healthz.ts — паттерн из проекта
interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  uptime: number;
}

interface CheckResult {
  status: 'ok' | 'fail';
  latencyMs?: number;
  message?: string;
}

export async function healthCheck(): Promise<HealthStatus> {
  const checks: Record<string, CheckResult> = {};

  // DB check
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    checks.db = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.db = { status: 'fail', message: String(err) };
  }

  // Memory check
  const mem = process.memoryUsage();
  const heapUsedMb = mem.heapUsed / 1024 / 1024;
  checks.memory = {
    status: heapUsedMb < 512 ? 'ok' : 'fail',
    message: `${heapUsedMb.toFixed(0)}MB heap used`,
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok');
  return {
    status: allOk ? 'ok' : 'degraded',
    checks,
    uptime: process.uptime(),
  };
}

// Handler
router.get('/healthz', async (req, res) => {
  const health = await healthCheck();
  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
});
```

## Anti-Patterns

```typescript
// ❌ Глаголы в REST путях
GET /api/getTasks
POST /api/createTask
POST /api/deleteTask/:id

// ✅ Ресурсы + HTTP методы
GET  /api/tasks
POST /api/tasks
DELETE /api/tasks/:id

// ❌ Непоследовательные ответы
res.json(tasks);                    // иногда голый массив
res.json({ data: task });           // иногда envelope без success
res.json({ error: 'Not found' });   // иногда строка

// ✅ Единый envelope
res.json({ success: true, data: tasks });
res.json({ success: true, data: task });
res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '...' } });

// ❌ Раскрытие стека в production
res.status(500).json({ error: err.stack });

// ✅ Generic message + structured logging
logger.error('Unhandled error', { err, requestId: req.id });
res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
```
