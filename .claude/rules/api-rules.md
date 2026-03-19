---
paths:
  - "apps/web/server/api/**"
  - "apps/bot/src/api/**"
---

# API Rules

- Валидация Zod на КАЖДЫЙ endpoint — request body, query params, route params
- Никогда не возвращай raw DB-ошибки клиенту — оборачивай в `{ error: string, code: number }`
- Public routes (`/api/track`, `/api/report/:token`) — CORS для любого домена
- Protected routes — проверка сессии через server middleware `auth.ts`
- Internal API (bot ↔ app) — проверка `Authorization: Bearer <internalApiSecret>` через `internal.ts`
- Rate limiting на `/api/track` (100 req/min per IP) и `/api/report/:token/auth` (5 req/min)
- Формат ответа: `{ data: T }` для успеха, `{ error: string, code: number }` для ошибок
