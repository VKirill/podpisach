---
paths:
  - "apps/bot/src/**"
---

# Bot Rules

- grammY — long polling по умолчанию, webhook — настраивается в UI
- `ChatMemberUpdated` → обработка joined/left/kicked/banned
- `createChatInviteLink` с `member_limit: 1` для автоссылок
- Revoke invite-ссылку СРАЗУ после подписки (лимит TG API ~1000 активных)
- Rate limiting: 20 ссылок/мин на канал
- MAX: long polling `GET /updates`, корреляция по временному окну ±60 сек
- Cron-задачи: linkCleanup (TTL), statsSync, conversionRetry
- Bot ждёт токен из UI — не начинает polling без валидного токена из БД
- Pino для логирования, retry-логика для всех внешних API
