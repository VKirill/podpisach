---
title: Configuration Component
type: reference
created: 2026-04-29
updated: 2026-04-29
status: active
confidence: medium
tags: [components, config, settings, secrets, runtime]
sources:
  - .env.example
  - docker-compose.yml
  - prisma.config.ts
  - prisma/schema.prisma
  - apps/web/nuxt.config.ts
  - apps/web/docker-entrypoint.sh
  - apps/web/server/utils/session.ts
  - apps/web/server/utils/ymClient.ts
  - apps/web/server/api/settings/index.get.ts
  - apps/web/server/api/settings/index.patch.ts
  - apps/web/server/api/settings/password.post.ts
  - apps/web/server/api/setup/status.get.ts
  - apps/web/server/api/setup/password.post.ts
  - apps/web/server/api/setup/bot.post.ts
  - apps/web/server/api/setup/channel.post.ts
  - apps/web/server/api/setup/complete.post.ts
  - apps/web/server/api/track/index.post.ts
  - apps/web/server/api/links/index.post.ts
  - apps/web/server/api/channels/index.post.ts
  - apps/web/server/api/integrations/ym/credentials.post.ts
  - apps/web/server/api/integrations/ym/callback.get.ts
  - apps/bot/src/config/index.ts
  - apps/bot/src/index.ts
  - apps/bot/src/api/internal.ts
  - apps/bot/src/attribution/maxMatcher.ts
  - apps/bot/src/jobs/conversionRetry.ts
  - apps/bot/src/integrations/yandexMetrika.ts
  - apps/bot/src/utils/logger.ts
  - packages/shared/src/crypto.ts
  - packages/shared/src/constants.ts
  - packages/shared/src/validation.ts
---

# Configuration Component

The configuration component spans environment variables, the singleton `Settings` database row, encrypted integration credentials, and runtime config consumers in the web and bot processes.

This page is a reference for changing configuration safely. For the deployment steps that set these values, see [deployment environment variables](../deployment.md#environment-variables).

## Public API

### Environment variables

| Variable | Scope | Default / example | Consumed by | Purpose |
|---|---|---|---|---|
| `POSTGRES_PASSWORD` | Compose host | `oppassword` in example (`.env.example:1-3`) | Compose builds `DATABASE_URL` for web and bot, and configures the Postgres service password (`docker-compose.yml:12-17`, `docker-compose.yml:32-35`, `docker-compose.yml:46-49`). | Database password for the bundled PostgreSQL service. |
| `DATABASE_URL` | Runtime containers, CI, local tools | `postgresql://op:oppassword@localhost:5432/podpisach` in example (`.env.example:1-3`) | Nuxt private runtime config, Prisma config, web entrypoint, and bot Prisma adapter (`apps/web/nuxt.config.ts:10-13`, `prisma.config.ts:9-13`, `apps/web/docker-entrypoint.sh:16-20`, `apps/bot/src/utils/prisma.ts:1-5`). | PostgreSQL connection string. |
| `PORT` | Compose host | `3000` in example (`.env.example:5-7`) | Compose port mapping `${PORT:-3000}:3000` (`docker-compose.yml:10-11`). | Host port for the Nuxt app. |
| `APP_URL` | Compose host | `http://localhost:3000` in example (`.env.example:5-8`) | Compose maps it to `NUXT_PUBLIC_APP_URL` (`docker-compose.yml:12-17`). | Public base URL used by generated scripts and OAuth redirect URLs. |
| `NUXT_PUBLIC_APP_URL` | Web container | `http://localhost:3000` fallback (`apps/web/nuxt.config.ts:14-17`) | Nuxt public runtime config and session cookie Secure decision (`apps/web/nuxt.config.ts:14-17`, `apps/web/server/utils/session.ts:13-19`). | Browser-visible app origin. |
| `BOT_INTERNAL_URL` | Web container | `http://bot:3001` fallback (`apps/web/nuxt.config.ts:10-14`) | Web-to-bot calls for tracking/manual links/setup start signal (`apps/web/server/api/track/index.post.ts:54-68`, `apps/web/server/api/links/index.post.ts:27-38`, `apps/web/server/api/setup/bot.post.ts:60-68`). | Private URL for bot internal API. |
| `APP_INTERNAL_URL` | Bot container | `http://app:3000` fallback (`apps/bot/src/jobs/conversionRetry.ts:10-14`, `apps/bot/src/integrations/yandexMetrika.ts:5-6`) | Bot Yandex conversion sender and retry job (`apps/bot/src/integrations/yandexMetrika.ts:57-67`, `apps/bot/src/jobs/conversionRetry.ts:48-58`). | Private URL for web internal API. |
| `NODE_ENV` | Both containers | `production` in Compose (`docker-compose.yml:16-17`, `docker-compose.yml:34-35`) | Bot logger transport and Docker runtime (`apps/bot/src/utils/logger.ts:3-9`). | Production/dev behavior switch. |
| `LOG_LEVEL` | Bot container | `info` fallback (`apps/bot/src/utils/logger.ts:3-4`) | Pino logger (`apps/bot/src/utils/logger.ts:1-9`). | Bot log verbosity. |

### Database-backed settings

| Field | Model | Who writes | Who reads | Purpose |
|---|---|---|---|---|
| `adminPasswordHash` | `Settings` | Setup password and settings password routes hash with bcrypt before storing (`apps/web/server/api/setup/password.post.ts:14-21`, `apps/web/server/api/settings/password.post.ts:1-18`). | Login compares submitted password against this hash (`apps/web/server/api/auth/login.post.ts:16-23`). | Single-admin password verifier. |
| `sessionSecret` | `Settings` | Web entrypoint creates a UUID on first Settings upsert (`apps/web/docker-entrypoint.sh:14-26`). | Session utility signs and verifies `ps-session` JWTs (`apps/web/server/utils/session.ts:7-33`). | Admin session signing key. |
| `internalApiSecret` | `Settings` | Web entrypoint creates a UUID on first Settings upsert (`apps/web/docker-entrypoint.sh:14-26`). | Bot internal API auth, web internal middleware, web-to-bot calls, token encryption/decryption, and bot config loading (`apps/bot/src/api/internal.ts:16-31`, `apps/web/server/api/track/index.post.ts:56-68`, `apps/bot/src/config/index.ts:49-61`, `packages/shared/src/crypto.ts:8-55`). | Shared internal Bearer secret and encryption key material. |
| `timezone` | `Settings` | Settings PATCH route validates and updates it (`apps/web/server/api/settings/index.patch.ts:1-21`). | Settings GET route exposes it to the admin UI (`apps/web/server/api/settings/index.get.ts:1-11`). | Display/reporting timezone. |
| `maxCorrelationWindowSec` | `Settings` | Settings PATCH route updates it (`apps/web/server/api/settings/index.patch.ts:1-21`). | Bot config returns it and MAX matcher reads it with shared default fallback (`apps/bot/src/config/index.ts:15-63`, `apps/bot/src/attribution/maxMatcher.ts:19-28`, `packages/shared/src/constants.ts:4-7`). | MAX attribution time window in seconds. |
| `setupCompleted` | `Settings` | Setup completion route sets it after prerequisites pass (`apps/web/server/api/setup/complete.post.ts:11-38`). | Setup status and auth/session routes expose or enforce it (`apps/web/server/api/setup/status.get.ts:1-27`, `apps/web/server/api/auth/login.post.ts:12-18`). | First-run setup gate. |

## Configuration lifecycle

```mermaid
sequenceDiagram
  participant Compose as Docker Compose env
  participant WebEntry as Web entrypoint
  participant DB as PostgreSQL Settings
  participant Web as Nuxt/Nitro API
  participant Bot as Bot worker
  participant Shared as @ps/shared crypto

  Compose->>Web: DATABASE_URL, BOT_INTERNAL_URL, NUXT_PUBLIC_APP_URL
  Compose->>Bot: DATABASE_URL, APP_INTERNAL_URL, NODE_ENV
  WebEntry->>DB: upsert Settings(id=1, sessionSecret, internalApiSecret)
  Web->>DB: setup password, bot token, channel, setupCompleted
  Web->>Shared: encrypt(bot token, internalApiSecret)
  Bot->>DB: load Settings + active Bot rows
  Bot->>Shared: decrypt(bot tokens, internalApiSecret)
  Web->>Bot: Bearer internalApiSecret for link/start requests
```

The first durable configuration object is the singleton `Settings` row. The Prisma schema gives it default `id = 1`, `timezone = 'Europe/Moscow'`, `maxCorrelationWindowSec = 60`, and `setupCompleted = false` (`prisma/schema.prisma:11-21`). The web entrypoint creates the row at container startup with generated `sessionSecret` and `internalApiSecret` if it does not already exist (`apps/web/docker-entrypoint.sh:14-26`).

The setup API then fills user-facing configuration: admin password, encrypted bot token, first channel, and setup completion state (`apps/web/server/api/setup/password.post.ts:14-23`, `apps/web/server/api/setup/bot.post.ts:48-70`, `apps/web/server/api/setup/channel.post.ts:31-131`, `apps/web/server/api/setup/complete.post.ts:11-38`).

## Runtime consumers

### Web runtime config

Nuxt private runtime config includes `databaseUrl` and `botInternalUrl`; public runtime config includes `appUrl` (`apps/web/nuxt.config.ts:10-18`). Server routes call `useRuntimeConfig()` where they need the bot internal URL or public redirect base (`apps/web/server/api/track/index.post.ts:54-68`, `apps/web/server/api/links/index.post.ts:27-38`, `apps/web/server/api/setup/bot.post.ts:60-68`, `apps/web/server/api/integrations/ym/callback.get.ts:39-40`).

Session cookies derive their `secure` flag from `process.env.NUXT_PUBLIC_APP_URL`, not `NODE_ENV` (`apps/web/server/utils/session.ts:13-19`). Set `APP_URL` to an HTTPS URL in production because Compose maps it to `NUXT_PUBLIC_APP_URL` (`docker-compose.yml:12-17`).

### Bot runtime config

`loadConfig()` polls for Settings through `loadSettings()`, then reads active Telegram and MAX `Bot` rows and decrypts their tokens with `settings.internalApiSecret` (`apps/bot/src/config/index.ts:15-63`). If Settings is missing, it retries six times at five-second intervals, then throws (`apps/bot/src/config/index.ts:15-36`). If a platform token is missing at startup, `pollForToken()` or `pollForMaxToken()` checks the database every five seconds and decrypts the token once setup creates it (`apps/bot/src/index.ts:20-58`).

### Encryption and integration credentials

The shared crypto helper derives a 32-byte key from the given secret and serializes encrypted values as `salt:iv:tag:ciphertext` (`packages/shared/src/crypto.ts:8-34`). Decryption expects exactly those four parts and throws on invalid format (`packages/shared/src/crypto.ts:36-55`).

Bot tokens are encrypted when setup stores a Bot row (`apps/web/server/api/setup/bot.post.ts:48-58`) and decrypted when the bot loads config (`apps/bot/src/config/index.ts:49-61`). Yandex credentials and OAuth tokens use the same secret: credentials are encrypted on save, OAuth callback encrypts tokens, and `ymClient` decrypts or refreshes them later (`apps/web/server/api/integrations/ym/credentials.post.ts:12-31`, `apps/web/server/api/integrations/ym/callback.get.ts:34-81`, `apps/web/server/utils/ymClient.ts:24-71`).

> [!IMPORTANT]
> `Settings.internalApiSecret` is both an internal API Bearer secret and encryption key material. Changing it without re-encrypting stored tokens makes bot and Yandex credentials unreadable (`apps/bot/src/config/index.ts:49-61`, `apps/web/server/utils/ymClient.ts:30-44`, `packages/shared/src/crypto.ts:8-55`).

## Configuration endpoints

| Method | Path | Handler | Behavior |
|---|---|---|---|
| `GET` | `/api/settings` | `apps/web/server/api/settings/index.get.ts:1` | Returns `timezone` and `maxCorrelationWindowSec`; throws `503` if Settings is missing (`apps/web/server/api/settings/index.get.ts:1-11`). |
| `PATCH` | `/api/settings` | `apps/web/server/api/settings/index.patch.ts:3` | Validates `settingsSchema`, updates Settings row `id=1`, and returns the updated display fields (`apps/web/server/api/settings/index.patch.ts:1-21`, `packages/shared/src/validation.ts:60-63`). |
| `POST` | `/api/settings/password` | `apps/web/server/api/settings/password.post.ts:1` | Updates the admin password hash; it requires Settings to exist (`apps/web/server/api/settings/password.post.ts:1-18`). |
| `GET` | `/api/setup/status` | `apps/web/server/api/setup/status.get.ts:1` | Reads setup state and counts prerequisite bot/channel records (`apps/web/server/api/setup/status.get.ts:1-27`). |
| `POST` | `/api/setup/password` | `apps/web/server/api/setup/password.post.ts:4` | Stores first admin password before setup completes (`apps/web/server/api/setup/password.post.ts:4-24`). |
| `POST` | `/api/setup/bot` | `apps/web/server/api/setup/bot.post.ts:13` | Validates Telegram token when applicable, encrypts token, inserts Bot row, and signals the bot process (`apps/web/server/api/setup/bot.post.ts:13-71`). |
| `POST` | `/api/setup/channel` | `apps/web/server/api/setup/channel.post.ts:31` | Uses decrypted bot token to validate Telegram channel and bot admin status, then creates/reactivates Channel (`apps/web/server/api/setup/channel.post.ts:31-131`). |
| `POST` | `/api/setup/complete` | `apps/web/server/api/setup/complete.post.ts:1` | Requires password, Telegram bot, and channel before setting `setupCompleted` and creating a session (`apps/web/server/api/setup/complete.post.ts:11-38`). |

## Validation contracts

Configuration payload schemas live in `@ps/shared` when they are part of the web/admin contract. `settingsSchema` accepts optional timezone and MAX correlation window between 10 and 3600 seconds (`packages/shared/src/validation.ts:60-63`). `setupPasswordSchema` requires at least 8 characters, and `setupBotSchema` accepts `telegram` or `max` plus a non-empty token (`packages/shared/src/validation.ts:23-34`).

Yandex credential validation requires non-empty `clientId` and `clientSecret` (`packages/shared/src/validation.ts:95-99`). Tracking payload validation also belongs here because `platform`, UTM/ad IDs, URL, and fingerprint become Visit/config-dependent attribution inputs (`packages/shared/src/validation.ts:7-21`).

## Inline gotchas

> [!CAUTION]
> **Do not rotate `internalApiSecret` casually.** It authenticates internal HTTP requests and decrypts bot/Yandex credentials (`apps/bot/src/api/internal.ts:16-31`, `apps/bot/src/config/index.ts:49-61`, `apps/web/server/utils/ymClient.ts:30-44`). See [gotchas: secret rotation](../gotchas.md#rotating-internalapisecret-can-make-encrypted-tokens-unreadable).

> [!WARNING]
> **Settings initialization errors can be hidden.** The web entrypoint redirects the Settings upsert snippet stderr to `/dev/null` and continues with `Settings init skipped` on failure (`apps/web/docker-entrypoint.sh:14-26`). If setup returns `Settings not initialized`, inspect container startup logs and the Settings row.

> [!WARNING]
> **Cookie security depends on `APP_URL`.** Session cookies set `secure` based on `NUXT_PUBLIC_APP_URL` starting with `https` (`apps/web/server/utils/session.ts:13-19`). In Compose, `APP_URL` supplies that value (`docker-compose.yml:12-17`).

> [!NOTE]
> **Prisma config has a build-time placeholder URL.** `prisma.config.ts` uses `process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder'` so Docker builds can run without a real database URL (`prisma.config.ts:9-13`). Runtime still needs the real connection string.

## Change checklist

| Change | Check |
|---|---|
| Add a new environment variable | Add it to Compose and `.env.example`, then cite its consumer (`docker-compose.yml:12-17`, `.env.example:1-10`). |
| Add a new persisted setting | Add field and migration in Prisma, expose only needed fields via `/api/settings`, and update `settingsSchema` (`prisma/schema.prisma:11-21`, `apps/web/server/api/settings/index.patch.ts:1-21`, `packages/shared/src/validation.ts:60-63`). |
| Change token encryption | Update all writers and readers together: bot setup, bot config, Yandex credentials/callback/client (`apps/web/server/api/setup/bot.post.ts:48-58`, `apps/bot/src/config/index.ts:49-61`, `apps/web/server/api/integrations/ym/credentials.post.ts:12-31`, `apps/web/server/utils/ymClient.ts:24-71`). |
| Change public app URL behavior | Verify generated scripts, OAuth redirect URI, and session cookie Secure flag (`apps/web/nuxt.config.ts:14-17`, `apps/web/server/api/integrations/ym/callback.get.ts:39-40`, `apps/web/server/utils/session.ts:13-19`). |
| Change MAX correlation window | Keep validation range and matcher fallback aligned (`packages/shared/src/validation.ts:60-63`, `apps/bot/src/attribution/maxMatcher.ts:19-28`, `packages/shared/src/constants.ts:4-7`). |

## See also

- [deployment environment variables](../deployment.md#environment-variables) — operational values for Compose deployment.
- [bot component configuration](bot.md#configuration) — bot-side consumers of Settings and environment variables.
- [API component configuration endpoints](api.md#public-api) — full route catalog, including settings/setup endpoints.
- [gotchas: configuration hazards](../gotchas.md#critical--data-loss--security) — high-severity secret and setup pitfalls.

## Backlinks

- [api](api.md)
- [bot](bot.md)
- [integrations](integrations.md)
- [max](max.md)
- [shared](shared.md)
- [web](web.md)
