---
paths:
  - "apps/web/server/**"
  - "apps/bot/src/**"
---

# Security Rules

- Bot tokens хранятся в БД зашифрованными AES-256, расшифровка только в runtime
- OAuth tokens (YM, GA) — тоже зашифрованы в БД
- Пароль администратора — bcrypt, HTTP-only cookie с JWT для сессии
- Публичные отчёты: UUID v4 в URL (не угадать) + обязательный пароль
- `internalApiSecret` генерируется автоматически при первом запуске (uuid)
- PostgreSQL доступна ТОЛЬКО из docker-сети, не exposed наружу
- JS-скрипт трекинга: CORS ограничен доменом пользователя (настраивается)
- Никогда не логируй секреты, токены, пароли — маскируй в logger
