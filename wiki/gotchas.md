---
title: Gotchas
type: reference
created: 2026-04-29
updated: 2026-04-29
status: active
confidence: medium
tags: [gotchas, troubleshooting, risks, stability]
sources:
  - docker-compose.yml
  - apps/web/docker-entrypoint.sh
  - apps/bot/docker-entrypoint.sh
  - apps/web/server/utils/session.ts
  - apps/web/server/api/reports/[token].get.ts
  - apps/web/server/api/reports/[token].auth.post.ts
  - apps/web/server/api/integrations/ga/index.post.ts
  - apps/web/server/api/integrations/ym/credentials.post.ts
  - apps/web/server/api/setup/bot.post.ts
  - apps/web/server/api/setup/complete.post.ts
  - apps/web/server/api/track/index.post.ts
  - apps/web/server/api/links/index.post.ts
  - apps/web/server/api/internal/conversion/ym.post.ts
  - apps/web/server/utils/ymClient.ts
  - apps/web/server/utils/reportData.ts
  - apps/web/server/api/stats/export.get.ts
  - apps/web/server/api/subscribers/[id].get.ts
  - apps/web/server/middleware/auth.ts
  - apps/web/server/middleware/internal.ts
  - apps/web/middleware/auth.ts
  - apps/web/middleware/setup.ts
  - apps/web/components/setup/SetupWizard.vue
  - apps/web/components/script/ScriptGenerator.vue
  - apps/web/assets/css/main.css
  - apps/web/nuxt.config.ts
  - apps/bot/src/index.ts
  - apps/bot/src/config/index.ts
  - apps/bot/src/api/internal.ts
  - apps/bot/src/telegram/services/linkService.ts
  - apps/bot/src/telegram/handlers/memberUpdate.ts
  - apps/bot/src/max/poller.ts
  - apps/bot/src/max/handlers/memberUpdate.ts
  - apps/bot/src/attribution/telegramMatcher.ts
  - apps/bot/src/attribution/maxMatcher.ts
  - apps/bot/src/jobs/linkCleanup.ts
  - apps/bot/src/jobs/conversionRetry.ts
  - apps/bot/src/utils/retry.ts
  - packages/shared/src/crypto.ts
  - packages/shared/src/constants.ts
  - packages/shared/src/validation.ts
  - prisma/schema.prisma
  - prisma/migrations/0001_init/migration.sql
---

# Gotchas

Known problems, edge cases, and landmines in Podpisach. Every entry follows **Problem → Risk → Workaround**. Read this before touching production data, auth, tracking, or bot integration code.

## Critical — Data Loss / Security

### Public report password can be bypassed by setting a cookie

**Pattern**: Users + auth bypass (Nygard §4.3).

**Problem**: The public report GET route only checks whether `report-session-${token}` exists when `passwordHash` is set; it does not verify a signature, value, expiry, or password-derived token (`apps/web/server/api/reports/[token].get.ts:20-29`). The auth route sets that cookie to the constant string `'1'` after bcrypt succeeds (`apps/web/server/api/reports/[token].auth.post.ts:34-44`).

**Risk**: A viewer who knows a report token can set `report-session-<token>=1` manually and read a password-protected report. If `showSubscriberNames`, UTM details, or costs are enabled, the GET route returns those fields after the cookie presence check (`apps/web/server/api/reports/[token].get.ts:31-48`, `apps/web/server/utils/reportData.ts:132-190`).

**Workaround**: Replace the constant cookie with a signed JWT or HMAC that includes the report token and expiry. Verify it in the GET route before calling `getReportData()`. Until fixed, treat report tokens as bearer secrets and disable sensitive visibility flags for externally shared reports.

### Google Analytics API secrets are stored in plaintext JSON

**Pattern**: Secret Exposure — Users / Force Multiplier (Nygard §4.3, §4.9).

**Problem**: The GA integration route writes `apiSecret` directly into `Integration.config` JSON during create and update (`apps/web/server/api/integrations/ga/index.post.ts:10-23`). By contrast, the shared crypto helper exists for AES-256-GCM encryption (`packages/shared/src/crypto.ts:1-55`), and Yandex token code decrypts encrypted values before use (`apps/web/server/utils/ymClient.ts:30-44`).

**Risk**: A database dump or read-only DB console access exposes the GA Measurement Protocol secret. The `Integration` model stores `config Json` without field-level protection (`prisma/schema.prisma:246-257`).

**Workaround**: Encrypt `apiSecret` with `encrypt(apiSecret, settings.internalApiSecret)` on write and decrypt it only when sending GA events. Add a migration or one-time script for existing plaintext configs.

### `docker compose down -v` deletes the only durable data volume

**Pattern**: Force Multiplier causing data loss (Nygard §4.9).

**Problem**: Compose stores PostgreSQL data in the named `pgdata` volume (`docker-compose.yml:50-62`). The file warns that `docker compose down -v` deletes all data (`docker-compose.yml:1-2`).

**Risk**: One maintenance command can delete Settings, encrypted bot tokens, channels, visits, subscribers, reports, and conversions. Those tables are the system of record (`prisma/schema.prisma:11-278`).

**Workaround**: Stop services with `docker compose stop` or `docker compose down` without `-v`. Before any destructive Compose command, take a PostgreSQL backup. See [deployment runbook (planned)](deployment.md) for operational steps when it exists.

### Rotating `internalApiSecret` can make encrypted tokens unreadable

**Pattern**: Force Multiplier + secret coupling (Nygard §4.9).

**Problem**: `encrypt()` and `decrypt()` derive their AES-256-GCM key from the provided secret (`packages/shared/src/crypto.ts:8-55`). Bot startup decrypts active Telegram and MAX bot tokens using `settings.internalApiSecret` (`apps/bot/src/config/index.ts:49-61`). The same Settings field also authenticates internal requests (`apps/bot/src/api/internal.ts:16-31`, `apps/web/server/middleware/internal.ts:3-16`).

**Risk**: Changing `Settings.internalApiSecret` without re-encrypting stored secrets breaks bot startup and token loading. It can also break web-to-bot calls and `/api/internal/**` calls at the same time.

**Workaround**: Rotate with a two-step migration: read all encrypted fields with the old secret, write them with the new secret, then update `Settings.internalApiSecret`. Restart both app and bot after verifying `/internal/bot/status`.

## High — Infrastructure / Stability

### Internal bot API accepts unbounded request bodies

**Pattern**: Users + Blocked Threads / memory pressure (Nygard §4.3, §4.4).

**Problem**: `parseBody()` appends every incoming `data` chunk to a string without a size limit (`apps/bot/src/api/internal.ts:205-219`). The auth check runs first, but any holder of `Settings.internalApiSecret` can send an arbitrarily large body to `/internal/link/create`, `/internal/link/revoke`, or `/internal/bot/start` (`apps/bot/src/api/internal.ts:16-48`).

**Risk**: A bad internal caller or leaked secret can force memory growth in the bot process and delay polling, cleanup, and link creation. Because bot and web share the same database, delayed bot work degrades tracking and attribution.

**Workaround**: Add a body-size cap before concatenating chunks, for example 64 KB. Destroy the socket or return `413` when the cap is exceeded. Keep the Bearer check, but do not rely on it as the only resource guard.

### External HTTP calls have no explicit timeout budget

**Pattern**: Integration Point without timeout (Nygard §4.1) → Slow Response (§4.10).

**Problem**: Several `$fetch` calls rely on default transport behavior: Telegram `getMe` during setup (`apps/web/server/api/setup/bot.post.ts:28-43`), web-to-bot link creation (`apps/web/server/api/links/index.post.ts:29-63`), Yandex OAuth refresh (`apps/web/server/utils/ymClient.ts:45-59`), Yandex API wrapper calls (`apps/web/server/utils/ymClient.ts:77-94`), and offline conversion upload (`apps/web/server/utils/ymClient.ts:105-130`).

**Risk**: A slow external API can hold a Nitro request open longer than the user expects. On the tracking path, `/api/track` catches bot failures and returns without an invite URL, so a hidden timeout can turn paid traffic into unattributed or unsubscribable traffic (`apps/web/server/api/track/index.post.ts:52-74`).

**Workaround**: Add `timeout` or `AbortSignal.timeout()` per integration point. Use short budgets for web-to-bot calls on `/api/track`, and longer but finite budgets for OAuth and offline conversion delivery.

### Settings initialization failure is swallowed in the web entrypoint

**Pattern**: Silent Error Swallowing (Nygard ch. 4 extension) → Cascading Failure (§4.2).

**Problem**: The web entrypoint runs a Node snippet to upsert `Settings`, redirects stderr to `/dev/null`, and continues with `|| echo "⚠️ Settings init skipped"` when it fails (`apps/web/docker-entrypoint.sh:14-26`). The bot config loader then waits up to 30 seconds for `Settings` and throws if it never appears (`apps/bot/src/config/index.ts:15-36`).

**Risk**: A first-run Settings failure can produce a partially started stack: Nuxt starts, but setup endpoints and bot startup return `Settings not initialized` or fatal startup errors (`apps/web/server/api/setup/complete.post.ts:1-5`, `apps/bot/src/index.ts:126-129`).

**Workaround**: Remove stderr suppression and fail the container when Settings upsert fails. If you see setup 503s, inspect the web container startup output and verify that `Settings` row `id=1` exists before debugging UI code.

### In-memory invite-link rate limit resets on bot restart

**Pattern**: Global Mutable State (Nygard ch. 4 extension) + Scaling Effects (§4.6).

**Problem**: Invite-link creation rate limiting uses a module-level `Map<channelId, timestamps>` in the bot process (`apps/bot/src/telegram/services/linkService.ts:8-23`). The bot records usage only in memory after a successful Telegram API call (`apps/bot/src/telegram/services/linkService.ts:54-83`).

**Risk**: Restarting the bot clears the limiter. A retry storm or repeated tracking clicks after restart can create more links per minute than intended, hitting Telegram limits or returning `null` from `createInviteLink()` after API failures (`apps/bot/src/telegram/services/linkService.ts:59-81`).

**Workaround**: Treat this limiter as best-effort. For durable limits, store recent link creation timestamps in PostgreSQL or count non-revoked auto links per channel in a transaction.

### MAX polling marker is not persisted

**Pattern**: Integration Point state loss (Nygard §4.1) + duplicate processing risk.

**Problem**: `startMaxPolling()` keeps the MAX update marker in a local variable and updates it from each response (`apps/bot/src/max/poller.ts:22-30`). `stopMaxPolling()` sets `running = false` and drops the current client; no marker is saved to the database (`apps/bot/src/max/poller.ts:49-56`).

**Risk**: A process restart can resume without the last marker. Depending on MAX API semantics, old updates may be replayed or recent updates may be skipped. Subscriber upserts reduce duplicate user rows, but `SubscriptionEvent` inserts can still duplicate event history (`apps/bot/src/max/handlers/memberUpdate.ts:41-120`, `apps/bot/src/max/handlers/memberUpdate.ts:171-180`).

**Workaround**: Persist the last marker per MAX bot in the database after a batch completes. Until then, after bot restarts, compare recent MAX subscription events for duplicates before trusting event counts.

### Cookie `secure` depends on public app URL configuration

**Pattern**: Misconfigured security boundary (Nygard §4.3 Users).

**Problem**: Session cookies set `secure` based on whether `NUXT_PUBLIC_APP_URL` starts with `https` (`apps/web/server/utils/session.ts:13-19`). Compose defaults the public URL to `http://localhost:3000` when `APP_URL` is missing (`docker-compose.yml:12-17`). A recent fix commit (`4702c84`) indicates this has already regressed once.

**Risk**: If production is served over HTTPS but `APP_URL` is left as HTTP, browsers may accept an admin session cookie without the Secure flag. That increases exposure if the site is ever reachable over plain HTTP.

**Workaround**: Set `APP_URL=https://<public-host>` in production. Add a startup check that refuses production when `NODE_ENV=production` and `NUXT_PUBLIC_APP_URL` is not HTTPS, unless an explicit local-dev flag is set.

## Medium — Developer Experience

### Tracking hides bot failures by returning a visit without an invite URL

**Problem**: `/api/track` catches any error from the bot internal link-create call, logs a console warning, and still returns `{ sessionId, invite_url: undefined }` (`apps/web/server/api/track/index.post.ts:52-74`, `apps/web/server/api/track/index.post.ts:86-90`).

**Risk**: Visitors can be tracked but not receive a Telegram invite link. This is intentional degradation, but it is easy to misread as a front-end bug on the customer site.

**Workaround**: When tracking works but buttons do not redirect, check bot availability and `/internal/link/create` before changing the generated script. Add structured logging or a counter for `invite_url` omissions.

### Setup bot start is fire-and-forget

**Problem**: After saving a bot token, the setup route calls `/internal/bot/start` and ignores failures in `.catch(() => {})` (`apps/web/server/api/setup/bot.post.ts:60-68`). The route returns success even when the bot process is not ready.

**Risk**: Setup can appear successful while the bot remains stopped. The bot does poll the database for tokens on startup, but a running process may still fail to start the selected bot and the UI will not show the internal error.

**Workaround**: After setup, call the bot status endpoint or inspect bot logs before assuming message handlers are active. For a code fix, return a warning when the start request fails instead of swallowing the error.

### Conversion retry can mark no-op retries as sent

**Problem**: `retryGaIntegration()` returns early when the conversion lacks `visit.sessionId` or the GA integration is inactive (`apps/bot/src/jobs/conversionRetry.ts:66-88`). The caller still updates the Conversion row to `status: 'sent'` after the function returns (`apps/bot/src/jobs/conversionRetry.ts:122-137`). `retryYmConversion()` can also return when no enabled server goal exists (`apps/bot/src/jobs/conversionRetry.ts:24-47`).

**Risk**: A conversion can be marked sent even though no external request happened. This hides missing configuration or incomplete attribution and makes later reconciliation harder.

**Workaround**: Have retry helpers return a result enum such as `sent | skipped | failed`. Only set `status: 'sent'` when an external request succeeds; record skipped reasons in `errorMessage`.

### Telegram fallback attribution can steal the wrong recent visit

**Problem**: When Telegram has no invite-link URL match, `telegramMatch()` selects the most recent unattributed Telegram visit in the last 24 hours for the channel (`apps/bot/src/attribution/telegramMatcher.ts:38-57`). The database enforces a unique `Subscriber.visitId`, and handlers retry without `visitId` when another subscriber already claimed it (`apps/bot/src/telegram/handlers/memberUpdate.ts:103-143`, `prisma/migrations/0001_init/migration.sql:287-303`).

**Risk**: Public-channel joins or missing invite-link data can attribute a subscriber to the wrong source with confidence `0.5`. Reports that group by UTM can then show misleading source performance.

**Workaround**: Treat `attributionConfidence < 1` as directional, not exact. For high-stakes reports, filter or flag fallback-attributed subscribers. Prefer private Telegram channels with auto invite links for exact attribution.

### MAX attribution depends on browser fingerprint/IP timing

**Problem**: MAX matching searches for an unattributed visit by fingerprint inside a time window, then falls back to IP hash inside the same window (`apps/bot/src/attribution/maxMatcher.ts:19-78`). The window comes from `Settings.maxCorrelationWindowSec`, defaulting to 60 seconds (`prisma/schema.prisma:11-18`, `packages/shared/src/constants.ts:4-7`).

**Risk**: Shared IPs, delayed joins, or browser fingerprint changes reduce attribution quality. The matcher returns confidence `0.80` for fingerprint and `0.70` for IP fallback (`apps/bot/src/attribution/maxMatcher.ts:41-73`, `packages/shared/src/constants.ts:34-40`).

**Workaround**: Tune `maxCorrelationWindowSec` per traffic pattern. Keep the window narrow for high-volume campaigns, and surface confidence in reports when interpreting MAX results.

### Public report data is correctly server-filtered, but new fields can leak if added outside `getReportData()`

**Problem**: Existing report visibility is enforced in `getReportData()`: costs are only queried when `showCosts` is true, subscriber rows are only returned when `showSubscriberNames` is true, and source/medium are nulled when UTM details are hidden (`apps/web/server/utils/reportData.ts:103-190`).

**Risk**: A future route or component that fetches extra report data outside this utility can bypass the visibility contract. This is easy to do because the public report route spreads `...data` directly into the response (`apps/web/server/api/reports/[token].get.ts:31-48`).

**Workaround**: Add all public report fields through `getReportData(channelId, options)`. Do not query report-only details in Vue components or sibling routes.

### Setup component names must use Nuxt auto-import prefixes

**Problem**: `SetupWizard.vue` renders `<SetupStepPassword>`, `<SetupStepBot>`, `<SetupStepChannel>`, and `<SetupStepComplete>` (`apps/web/components/setup/SetupWizard.vue:5-11`). The commit history includes a fix for auto-import prefixed component names (`20fefb2`), so this naming is intentional.

**Risk**: Renaming these tags to shorter names such as `<StepPassword>` can break Nuxt component auto-import resolution or hydration behavior.

**Workaround**: Keep component tags aligned with the directory-prefixed Nuxt auto-import names, or add explicit imports in the `<script setup>` block before renaming.

### Generated script component must not contain literal nested `<script>` tokens

**Problem**: `ScriptGenerator.vue` builds `scriptClose` and `scriptOpen` by concatenating strings and warns not to write literal `</script>` or `<script>` tokens because they break the SFC parser (`apps/web/components/script/ScriptGenerator.vue:25-42`).

**Risk**: A harmless-looking refactor of the generated snippet can make the Vue single-file component fail to parse.

**Workaround**: Keep the split-string pattern when generating installation code. If you move snippet generation to a helper, preserve tests or snapshots around the exact output.

## Low — Annoyances

### CSV export caps subscribers at 50,000 rows

**Problem**: The CSV export route uses `take: 50_000` when fetching subscribers (`apps/web/server/api/stats/export.get.ts:40-61`). It does not paginate or indicate that results were truncated.

**Risk**: Large installations export only the newest 50,000 matching subscribers, ordered by `subscribedAt desc` (`apps/web/server/api/stats/export.get.ts:59-61`). Older rows are silently omitted.

**Workaround**: For large channels, export per status or add date filters before relying on a full CSV. A code fix should add pagination or a response header that reports truncation.

### Subscriber detail only returns the latest 50 events

**Problem**: The subscriber detail route includes related events ordered by newest first with `take: 50` (`apps/web/server/api/subscribers/[id].get.ts:35-43`).

**Risk**: Long-lived subscribers with many join/leave cycles show an incomplete event history. This can mislead debugging if the oldest event matters.

**Workaround**: For support investigations, query `SubscriptionEvent` directly or add paginated events to the API.

### Nuxt UI styles must stay imported from `main.css`

**Problem**: `main.css` imports both Tailwind and `@nuxt/ui` (`apps/web/assets/css/main.css:1-2`). A recent fix commit (`ddfa5cc`) added the Nuxt UI styles explicitly.

**Risk**: Removing `@import "@nuxt/ui";` can produce missing component styles while TypeScript and build checks still pass.

**Workaround**: Keep both imports unless Nuxt UI styling is moved to an officially supported replacement. Verify UI components visually after CSS changes.

### Prisma 7 needs adapter-based client initialization in both runtimes

**Problem**: Both Prisma utilities create `PrismaPg` with `process.env.DATABASE_URL!` and pass it to `new PrismaClient({ adapter })` (`apps/web/server/utils/prisma.ts:1-17`, `apps/bot/src/utils/prisma.ts:1-5`). The commit history includes multiple Prisma 7 fixes (`1fd2eed`, `f2511cf`, `45f218f`, `fe4fa59`).

**Risk**: Reverting to older `datasourceUrl` patterns or removing the adapter can break runtime database access even when the schema compiles.

**Workaround**: Keep Prisma 7 initialization consistent in web and bot. If you change one utility, change the other and run both app startup paths.

### Migration SQL is the real deploy artifact, not only `schema.prisma`

**Problem**: The web entrypoint runs `npx prisma migrate deploy --schema prisma/schema.prisma` (`apps/web/docker-entrypoint.sh:10-12`). The checked-in initial migration creates tables, indexes, and foreign keys (`prisma/migrations/0001_init/migration.sql:25-382`).

**Risk**: Editing only `schema.prisma` without adding a migration means production `migrate deploy` will not apply the intended change.

**Workaround**: For schema changes, commit a Prisma migration and review its SQL. Do not rely on `db push` behavior for deploys.

## See also

- [architecture runtime views](architecture.md#runtime-views) — how tracking, bot events, and conversion retry connect.
- [architecture decisions](decisions.md#decision-map) — why the repo uses two processes, Prisma, and shared contracts.
- [deployment (planned)](deployment.md) — backup, migration, and Compose runbook.
- [data model (planned)](data-model.md) — table relationships behind attribution and reports.

## Backlinks

- [active-areas](./active-areas.md)
- [active-tasks](./active-tasks.md)
- [architecture](./architecture.md)
- [api](./components/api.md)
- [attribution](./components/attribution.md)
- [bot](./components/bot.md)
- [config](./components/config.md)
- [integrations](./components/integrations.md)
- [jobs](./components/jobs.md)
- [max](./components/max.md)
- [telegram](./components/telegram.md)
- [web](./components/web.md)
- [data-model](./data-model.md)
- [deployment](./deployment.md)
- [gaps](./gaps.md)
- [overview](./overview.md)
