# Node.js Backend Patterns — Project-Specific Reference

> Source: Node.js 20 docs + project analysis | Project: mycolormemory | Generated: 2026-03-16

## Graceful Shutdown

Проект использует `process.once('SIGINT'|'SIGTERM')` в `src/app/index.ts`.
Текущая реализация НЕ обрабатывает `uncaughtException`/`unhandledRejection`.

### Рекомендуемый паттерн для проекта

```ts
// src/app/index.ts — enhanced shutdown
import { logger, sanitizeError } from '@shared/utils/logger.js';

let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown`);

  const SHUTDOWN_TIMEOUT = 15_000; // 15s for BullMQ workers to finish
  const timer = setTimeout(() => {
    logger.error('Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
  timer.unref(); // don't keep event loop alive

  try {
    // 1. Stop accepting new work
    stopNotificationWorker();
    stopAnalyticsSender();
    stopRestorationWorker();
    stopAnimationWorker();

    // 2. Close HTTP server (drain in-flight requests)
    await server.close();

    // 3. Stop bot polling
    bot.stop();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', sanitizeError(error));
    process.exit(1);
  }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Missing in current codebase — add these:
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', sanitizeError(error));
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', sanitizeError(reason));
  // Don't exit — log and monitor. Node 20 doesn't crash on unhandled rejections by default.
});
```

### BullMQ Worker shutdown

BullMQ workers должны вызывать `worker.close()` (async) для завершения текущих jobs:

```ts
// src/features/restoration/jobs/restoration.job.ts
let worker: Worker | null = null;

export function startRestorationWorker(bot: Bot) {
  worker = new Worker('restoration', processor, {
    connection: createConnection(),
    concurrency: 2,
  });
  // ... event handlers
}

export async function stopRestorationWorker() {
  if (worker) {
    await worker.close(); // waits for current job to finish
    worker = null;
  }
}
```

## Error Handling & Classification

Проект использует `sanitizeError()` + Winston. Паттерн классификации ошибок:

```ts
// src/shared/utils/errors.ts — operational vs programmer errors
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Operational — expected, recoverable
export class NotFoundError extends AppError {
  constructor(entity: string, id: string | number) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(userId: number, required: number, available: number) {
    super(
      `Insufficient credits: need ${required}, have ${available}`,
      'INSUFFICIENT_CREDITS',
      402,
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: Error) {
    super(`${service} service error`, 'EXTERNAL_SERVICE_ERROR', 502);
    if (cause) this.cause = cause;
  }
}

// Usage in features:
import { ExternalServiceError } from '@shared/utils/errors.js';

const result = await retryWithBackoff(
  () => orchestrator.restore(imageUrl),
  { operation: 'restoration', provider: 'laozhang', maxRetries: 3 },
).catch((error) => {
  throw new ExternalServiceError('AI Orchestrator', error);
});
```

## Retry with Exponential Backoff

Проект уже имеет `retryWithBackoff()` в `src/shared/utils/retry.ts`.
Ключевые паттерны использования:

```ts
// AI calls — ОБЯЗАТЕЛЬНО через retry (правило проекта)
const result = await retryWithBackoff(
  () => laozhangClient.restore(imageUrl),
  {
    operation: 'photo-restoration',
    provider: 'laozhang',
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
  },
);

// Webhook delivery — больше попыток, длиннее задержка
await retryWithBackoff(
  () => axios.post(callbackUrl, payload),
  {
    operation: 'webhook-delivery',
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
  },
);
```

### Circuit Breaker дополнение

Если AI-провайдер падает часто, retry недостаточно — нужен circuit breaker:

```ts
// src/shared/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly resetTimeout: number = 60_000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Usage with AIOrchestrator:
const laozhangBreaker = new CircuitBreaker(5, 60_000);

async function restoreWithCircuitBreaker(imageUrl: string) {
  return laozhangBreaker.execute(() =>
    retryWithBackoff(
      () => laozhangClient.restore(imageUrl),
      { operation: 'restoration', provider: 'laozhang' },
    ),
  );
}
```

## Environment Validation (Zod)

Проект использует `getEnv()` singleton с Zod-валидацией в `src/shared/config/env.ts`.

### Паттерн расширения

```ts
// Adding a new env var — always update envSchema
const envSchema = z.object({
  // ... existing vars ...

  // New feature flag — with default + transform
  FEATURE_VIDEO_ENABLED: z.string().default('false').transform((v) => v === 'true'),

  // New API key — optional with validation
  NEW_SERVICE_API_KEY: z.string().min(1).optional(),

  // URL with default
  NEW_SERVICE_BASE_URL: z.string().url().default('https://api.example.com'),
});

// In feature code — NEVER process.env directly
const env = getEnv();
if (env.FEATURE_VIDEO_ENABLED) {
  // ...
}
```

### Типизация env

```ts
// getEnv() returns Env type — full autocompletion
import type { Env } from '@shared/config/env.js';

function createService(env: Pick<Env, 'LAOZHANG_API_KEY' | 'LAOZHANG_BASE_URL'>) {
  // Dependency injection — testable, type-safe
}
```

## Winston Logging Patterns

Проект: Winston 3.17 с JSON format + console colorize.

### Structured logging best practices

```ts
// GOOD — structured context object
logger.info('Payment processed', {
  userId: user.id,
  amount: transaction.amount,
  credits: transaction.credits,
  paymentMethod: 'cloudpayments',
  duration: Date.now() - startTime,
});

// BAD — string interpolation (не searchable, не parseable)
logger.info(`Payment of ${amount} processed for user ${userId}`);

// Error logging — always use sanitizeError()
logger.error('Restoration failed', {
  ...sanitizeError(error),
  userId,
  restorationId,
  provider: 'laozhang',
});
```

### Child loggers для контекста модуля

```ts
// src/features/payment/services/cloudpayments.service.ts
const log = logger.child({ module: 'cloudpayments' });

// All logs from this module include { module: 'cloudpayments' }
log.info('Webhook received', { invoiceId });
log.error('HMAC verification failed', { ip: request.ip });
```

### Log levels для проекта

```
error  — unrecoverable: DB down, payment failed after retries
warn   — degraded: AI fallback triggered, rate limit approaching
info   — business events: payment, restoration complete, user signup
debug  — technical: API request/response, cache hit/miss (dev only)
```

## Async Patterns

### Promise.all для параллельных запросов

```ts
// src/features/profile/services/profile.service.ts — existing pattern
const [animations, restorations] = await Promise.all([
  animationRepository.countByUserId(userId),
  restorationRepository.countByUserId(userId),
]);

// Promise.allSettled — when partial results are acceptable
const results = await Promise.allSettled([
  sendToYandexMetrika(events),
  sendToGA4(events),
]);

for (const result of results) {
  if (result.status === 'rejected') {
    logger.warn('Analytics delivery failed', sanitizeError(result.reason));
  }
}
```

### AbortController для таймаутов

```ts
// AI API calls with timeout
async function callWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = 30_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

// Usage:
const result = await callWithTimeout(
  (signal) => axios.post(url, data, { signal }),
  30_000, // 30s timeout for AI restoration
);
```

## Module Resolution (NodeNext)

Проект использует `NodeNext` module resolution + `tsc-alias`.

### Import rules

```ts
// ✅ CORRECT — .js extension always (even for .ts files)
import { getEnv } from '@shared/config/env.js';
import { logger } from '@shared/utils/logger.js';
import { UserRepository } from '@entities/user/user.repository.js';

// ✅ CORRECT — type imports
import type { Env } from '@shared/config/env.js';
import type { User } from '@entities/user/user.types.js';

// ❌ WRONG — no extension
import { getEnv } from '@shared/config/env';

// ❌ WRONG — .ts extension
import { getEnv } from '@shared/config/env.ts';

// Path aliases (tsconfig.json paths → tsc-alias resolves in dist/)
// @shared/*  → src/shared/*
// @features/* → src/features/*
// @entities/* → src/entities/*
// @infrastructure/* → src/infrastructure/*
```

## Performance Patterns

### Singleton для тяжёлых ресурсов

```ts
// src/infrastructure/database/client.ts — Prisma singleton pattern
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: getEnv().DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (getEnv().NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma; // prevent multiple instances in dev
}
```

### Avoid blocking the event loop

```ts
// ❌ BAD — synchronous crypto in request handler
import { createHash } from 'node:crypto';
const hash = createHash('sha256').update(largeData).digest('hex');

// ✅ GOOD — use setImmediate for CPU-heavy work in workers
function processInChunks<T>(items: T[], chunkSize: number, processor: (chunk: T[]) => void) {
  let i = 0;
  function next() {
    const chunk = items.slice(i, i + chunkSize);
    if (chunk.length === 0) return;
    processor(chunk);
    i += chunkSize;
    setImmediate(next); // yield to event loop
  }
  next();
}
```

## Health Check Pattern

```ts
// src/app/server.ts — existing /health endpoint
// Enhanced version with dependency checks:

server.get('/health', async (_request, reply) => {
  const checks = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
  };

  // Optional: deep health check with ?deep=true
  // Check DB, Redis connectivity
  return reply.send(checks);
});

// Deep health check (for monitoring, not load balancer)
server.get('/health/deep', async (_request, reply) => {
  const results: Record<string, 'ok' | 'error'> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    results['database'] = 'ok';
  } catch {
    results['database'] = 'error';
  }

  try {
    const redis = createConnection();
    await redis.ping();
    await redis.quit();
    results['redis'] = 'ok';
  } catch {
    results['redis'] = 'error';
  }

  const allOk = Object.values(results).every((v) => v === 'ok');
  return reply.status(allOk ? 200 : 503).send({
    status: allOk ? 'ok' : 'degraded',
    checks: results,
    timestamp: new Date().toISOString(),
  });
});
```
