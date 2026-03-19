# TypeScript 5.7 — Project-Specific Reference

> Source: TypeScript 5.7 docs + project patterns | Project: mycolormemory | Generated: 2026-03-15

---

## as const + typeof — Derive Union Types

Проект использует этот паттерн для `SupportedLocale`:

```ts
// src/shared/i18n/config.ts
export const SUPPORTED_LOCALES = [
  'ru', 'en', 'ar', 'es', 'tr', 'pt', 'hi', 'id', 'uk', 'vi',
] as const;

// Derive union type from array — вместо ручного перечисления
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
// => 'ru' | 'en' | 'ar' | 'es' | 'tr' | 'pt' | 'hi' | 'id' | 'uk' | 'vi'

// Type guard с includes работает через предикат
export function isValidLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as ReadonlyArray<string>).includes(locale);
}
```

То же для credit types, payment providers, job names:

```ts
export const CREDIT_TYPES = ['restoration', 'animation'] as const;
export type CreditType = (typeof CREDIT_TYPES)[number]; // 'restoration' | 'animation'

export const JOB_NAMES = ['restore-image', 'generate-animation'] as const;
export type JobName = (typeof JOB_NAMES)[number];
```

---

## Zod + Fastify Type Integration

Паттерн из `analytics.controller.ts` и `payment.schemas.ts`:

```ts
import { z } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';

// Определяем схему один раз
const saveAnalyticsSchema = z.object({
  userId: z.string().uuid(),
  yandexClientId: z.string().nullable().optional(),
  gaClientId: z.string().nullable().optional(),
  messageId: z.number().int().positive().optional(),
});

// Fastify route — тип Body из схемы
export async function saveAnalyticsHandler(
  request: FastifyRequest<{ Body: z.infer<typeof saveAnalyticsSchema> }>,
  reply: FastifyReply
) {
  const data = saveAnalyticsSchema.parse(request.body); // runtime validation
  // data типизирован как z.infer<typeof saveAnalyticsSchema>
}
```

`z.infer` / `z.input` / `z.output` — разница:

```ts
const schema = z.object({
  // transform меняет тип output
  PORT: z.string().default('3000').transform(Number),
  SSL_ENABLED: z.string().default('false').transform((v) => v === 'true'),
});

type Input = z.input<typeof schema>;   // { PORT?: string; SSL_ENABLED?: string }
type Output = z.infer<typeof schema>;  // { PORT: number; SSL_ENABLED: boolean }
// z.infer === z.output — тип после transform и default
```

Паттерн из `env.ts` — валидация `process.env`:

```ts
export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function getEnv(): Env {
  if (validatedEnv) return validatedEnv;
  validatedEnv = envSchema.parse(process.env);
  return validatedEnv;
}
```

---

## Fastify Generic Types — FastifyRequest<{...}>

Все варианты из проекта:

```ts
import { FastifyRequest, FastifyReply } from 'fastify';

// Params
async function getRestorationHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) { }

// Querystring
fastify.get<{ Querystring: { token?: string } }>('/verify', handler);

// Params + Querystring
fastify.get<{
  Params: { invoiceId: string };
  Querystring: { widgetUrl?: string };
}>('/web/payment/:invoiceId', handler);

// Body из Zod schema
async function handler(
  request: FastifyRequest<{ Body: z.infer<typeof TelegramStarsPayloadSchema> }>,
  reply: FastifyReply
) { }

// Body из interface (webhook payload)
async function cloudpaymentsWebhook(
  request: FastifyRequest<{ Body: CloudPaymentsWebhookPayload }>,
  reply: FastifyReply
) { }
```

---

## Module Augmentation — rawBody без `as any`

Текущий tech debt в `server.ts`:

```ts
// ПЛОХО — as any:
(req as any).rawBody = body;
const rawBody = (request as any).rawBody;
```

Правильное решение через module augmentation:

```ts
// src/shared/types/fastify.d.ts
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}
```

После этого:

```ts
// server.ts — content type parser
fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' },
  (req, body: string, done) => {
    req.rawBody = body; // типизировано, без as any
    done(null, qs.parse(body));
  }
);

// cloudpayments.webhook.ts
const rawBody = request.rawBody; // string | undefined — типизировано
if (!rawBody) return reply.code(400).send({ error: 'Missing raw body' });
```

---

## Record<K, V> Patterns

Когда что использовать:

```ts
// Record<SupportedLocale, string> — исчерпывающий маппинг, TS проверяет полноту
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  ru: 'Русский', en: 'English', ar: 'العربية', /* ... все 10 */
};

// Record<string, SupportedLocale> — динамические ключи из внешних данных
const langMap: Record<string, SupportedLocale> = {
  'zh': 'en', 'zh-cn': 'en', 'zh-tw': 'en', /* ... */
};

// Record<string, unknown> — для metadata без конкретной схемы
metadata?: Record<string, unknown>; // в DTO и аналитических событиях

// Nested Record — кэши
const translationsCache: Record<string, Record<string, string>> = {};

// Record vs Map:
// Record — статические ключи, сериализация JSON, передача в API
// Map — динамические ключи, лучший lookup O(1), нельзя в JSON
```

---

## unknown vs any — Строгая обработка ошибок

TypeScript 5.7: `useUnknownInCatchVariables: true` включён при `strict: true`.

```ts
// ПЛОХО — catch(error: any) теряет безопасность типов
} catch (error: any) {
  if (error.code === 'EADDRINUSE') { ... } // нет проверки
}

// ХОРОШО — catch(error: unknown) + type narrowing
} catch (error: unknown) {
  if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
    logger.error('Port already in use');
    process.exit(1);
  }
  throw error;
}

// Utility для логирования ошибок (паттерн из logger.ts)
export function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { raw: String(error) };
}

// В retry.ts — обращение к response.status через unknown
} catch (error: unknown) {
  const httpError = error as { response?: { status?: number }; status?: number; code?: string };
  const status = httpError.response?.status ?? httpError.status;
  // Или лучше через type guard:
  if (isHttpError(error)) { ... }
}

function isHttpError(e: unknown): e is { response: { status: number } } {
  return typeof e === 'object' && e !== null &&
    'response' in e &&
    typeof (e as { response: unknown }).response === 'object';
}
```

---

## Interface vs Type — DTO Pattern

Правило для этого проекта:

```ts
// Type — для re-export из Prisma (нельзя extends, только alias)
import { User as PrismaUser } from '@prisma/client';
export type User = PrismaUser;

// Interface — для DTOs (можно расширять, явное описание контракта)
export interface CreateUserDTO {
  telegramId: bigint | number;
  username?: string;
  language?: string;
  referredBy?: string;
}

export interface UpdateUserDTO {
  restorationCredits?: number;
  animationCredits?: number;
}

// Interface — для service results с опциональными полями
export interface RestorationResult {
  success: boolean;
  url?: string;
  error?: string;
}

// Type — для union и computed types
export type CreditType = 'restoration' | 'animation';
export type OptionalEnv = Partial<Env>;
```

---

## Branded Types — userId, telegramId, credits

Предотвращает смешивание `string` UUID и `number` telegramId:

```ts
// Branded type pattern (TypeScript 5.7 nominal typing)
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type TelegramId = Brand<bigint, 'TelegramId'>;
export type RestorationCredits = Brand<number, 'RestorationCredits'>;
export type AnimationCredits = Brand<number, 'AnimationCredits'>;

// Конструкторы
export const UserId = (id: string): UserId => id as UserId;
export const TelegramId = (id: bigint | number): TelegramId =>
  BigInt(id) as TelegramId;

// Использование в DTO
export interface CreateUserDTO {
  telegramId: TelegramId; // нельзя случайно передать UserId
  username?: string;
}

// В функциях
async function decrementCredits(
  userId: UserId,
  amount: RestorationCredits
): Promise<void> { ... }

// TS не даст перепутать:
// decrementCredits(user.telegramId, credits) // Error: TelegramId не совместим с UserId
```

---

## Barrel Exports — Type-only imports

Паттерн из `entities/*/index.ts`:

```ts
// entities/user/index.ts
export type { User, CreateUserDTO, UpdateUserDTO } from './types';
export { UserRepository } from './repository';

// В feature: import только типов
import type { User, CreateUserDTO } from '@entities/user';
// import type — не тянет JS runtime, только типы
// Обязательно при FSD: features → entities только через type imports для side-effect free
```

---

## Zod 4.3 — Актуальные паттерны

```ts
import { z } from 'zod';

// preprocess для сложной трансформации (из env.ts)
z.preprocess(
  (val) => {
    if (!val || val === '') return undefined;
    return val;
  },
  z.string().url().optional()
)

// union для гибкого userId (из analytics.controller.ts)
userId: z.union([
  z.string().uuid(),
  z.string().regex(/^\d+$/).transform((val) => val),
])

// Zod 4 — z.discriminatedUnion для быстрого parsing
const PaymentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('restoration'), credits: z.number() }),
  z.object({ type: z.literal('animation'), credits: z.number() }),
]);

// safeParse для graceful handling
const result = TelegramStarsPayloadSchema.safeParse(data);
if (!result.success) {
  logger.warn('Invalid payload', { errors: result.error.flatten() });
  return reply.code(400).send({ error: 'Validation failed' });
}
const payload = result.data; // типизирован
```
