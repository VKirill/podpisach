---
paths:
  - "prisma/**"
  - "apps/web/server/**"
  - "apps/bot/src/**"
---

# Prisma Rules

- Всегда используй `include` или `select` — НИКОГДА не полагайся на lazy loading
- Для списков — пагинация: `take` + `skip` (50 записей на страницу)
- Сложные агрегации — `$queryRaw` с параметрами, НИКОГДА `$queryRawUnsafe`
- UTM-поля ограничены 500 символов — валидируй перед записью
- Settings — singleton с `id: 1`, используй `upsert` при seed
- Миграции: `prisma migrate dev` локально, `prisma migrate deploy` в Docker entrypoint
- При добавлении индекса — проверь влияние на INSERT/UPDATE производительность
