---
title: Active Tasks
type: reference
created: 2026-04-29
updated: 2026-04-29
status: active
confidence: medium
tags: [active-tasks, backlog, audit]
sources:
  - package.json
  - apps/web/package.json
  - docker-compose.dev.yml
  - scripts/install.sh
  - scripts/backup.sh
  - scripts/restore.sh
  - scripts/update.sh
  - prisma/seed.ts
  - apps/web/server/middleware/auth.ts
  - apps/web/server/api/reports/[token].get.ts
  - apps/web/server/api/integrations/ga/index.post.ts
  - apps/web/server/api/integrations/ga/index.get.ts
  - apps/web/server/api/sources/index.get.ts
  - apps/web/server/api/stats/export.get.ts
  - apps/web/server/utils/rateLimiter.ts
  - apps/web/server/utils/session.ts
  - apps/web/server/utils/reportData.ts
  - apps/web/server/utils/ymClient.ts
  - apps/web/vitest.config.ts
  - apps/web/tests/utils/format.test.ts
  - apps/bot/src/api/internal.ts
  - apps/bot/src/max/poller.ts
  - apps/bot/src/telegram/services/linkService.ts
  - apps/bot/tests/attribution/maxMatcher.test.ts
  - packages/shared/tests/validation.test.ts
---

# Active Tasks

This page is the current actionable task queue inferred from code evidence: it lists work that a future coding agent can pick up without rereading the whole wiki.

The repository does not contain a first-class issue tracker file. The root scripts expose build, dev, lint, typecheck, Prisma, seed, and test commands, but not a task list (`package.json:5-18`). Treat this page as a code-derived backlog snapshot, not a product roadmap. For risk narratives, use [gotchas](gotchas.md#critical--data-loss--security); for missing documentation, use [gaps](gaps.md#gap-map).

## Task priority map

| Priority | Task | Area | Why now | Evidence |
|---|---|---|---|---|
| P0 | Harden public report password sessions | Security | The report GET route gates password-protected reports by cookie presence. | `apps/web/server/api/reports/[token].get.ts:20-35` |
| P0 | Encrypt or migrate Google Analytics API secrets | Security | GA config stores arbitrary `apiSecret` values in JSON without using shared crypto. | `apps/web/server/api/integrations/ga/index.post.ts:1-37`, `apps/web/server/api/integrations/ga/index.get.ts:1-24` |
| P1 | Add request size limits to the bot internal API | Stability | `parseBody()` concatenates request chunks without a maximum size. | `apps/bot/src/api/internal.ts:205-218` |
| P1 | Add timeout budgets to outbound integration calls | Stability | Yandex requests use `$fetch.raw()` and `$fetch()` without explicit timeout or abort configuration. | `apps/web/server/utils/ymClient.ts:31-58`, `apps/web/server/utils/ymClient.ts:80-129` |
| P1 | Persist MAX polling progress | Reliability | The MAX poller stores `lastUpdateId` only in process memory. | `apps/bot/src/max/poller.ts:6-14`, `apps/bot/src/max/poller.ts:47-53` |
| P1 | Make invite-link rate limiting durable or explicit | Reliability | Telegram invite-link rate limiting is a module-level `Map`. | `apps/bot/src/telegram/services/linkService.ts:8-23` |
| P2 | Document and validate operations scripts | Operations | Install/update/backup/restore scripts encode production behavior outside app code. | `scripts/install.sh:30-82`, `scripts/backup.sh:17-38`, `scripts/restore.sh:25-48`, `scripts/update.sh:12-37` |
| P2 | Split and document source analytics behavior | Analytics | `/api/sources` has raw SQL, cost merging, and empty-on-error behavior. | `apps/web/server/api/sources/index.get.ts:37-173` |
| P2 | Add CI-quality test coverage for API and jobs | Testing | Current tests cover utilities, shared schemas, and selected attribution paths, not Nitro route integration. | `apps/web/vitest.config.ts:25-28`, `apps/web/tests/utils/format.test.ts:1-91`, `apps/bot/tests/attribution/maxMatcher.test.ts:21-158` |
| P3 | Replace placeholder lint command | Tooling | Web package `lint` is a placeholder, while root `lint` delegates to Turbo. | `apps/web/package.json:5-10`, `package.json:5-15` |

## P0 — security tasks

### Harden public report password sessions

**Current behavior.** The public report GET route returns data if a password-protected report has any cookie named `report-session-<token>`; this file does not validate a signed value or check expiry (`apps/web/server/api/reports/[token].get.ts:20-35`). Server auth middleware also treats `/api/reports/` as public, so report routes must enforce their own access rules (`apps/web/server/middleware/auth.ts:3-11`).

**Task.** Replace presence-only report cookies with signed, expiring tokens or server-side report sessions. Update the report auth and read routes together so the GET route validates the same proof the auth route creates.

**Acceptance checks.**

- A forged `report-session-<token>=anything` cookie does not unlock a protected report.
- Passwordless reports still return public data by token.
- Report visibility flags continue to be enforced in `getReportData()` before data leaves the server (`apps/web/server/utils/reportData.ts:41-191`).

### Encrypt or migrate Google Analytics API secrets

**Current behavior.** GA integration writes `apiSecret` values into `settingsJson` as plain JSON for `measurementId`, `apiSecret`, and optional `streamName` (`apps/web/server/api/integrations/ga/index.post.ts:1-37`). The GET route returns integration rows with `settingsJson`, so future changes must confirm secrets are not exposed to the UI or logs (`apps/web/server/api/integrations/ga/index.get.ts:1-24`).

**Task.** Store GA secrets with the same encrypted-secret pattern used elsewhere, or split secret material from display settings. Plan a migration for existing `settingsJson.apiSecret` values before changing read/write code.

**Acceptance checks.**

- New GA secrets are not stored as plaintext JSON.
- Existing GA integrations can still send conversions after migration.
- Admin read endpoints do not return raw secrets.

## P1 — reliability and stability tasks

### Add request size limits to the bot internal API

**Current behavior.** The bot internal HTTP server reads non-GET bodies with `parseBody(req)`, appends each chunk to a string, and resolves parsed JSON or `{}` (`apps/bot/src/api/internal.ts:33-41`, `apps/bot/src/api/internal.ts:205-218`). There is no maximum byte count in that function.

**Task.** Add a byte limit to `parseBody()`, return HTTP 413 for oversized requests, and keep existing JSON parse fallback semantics only for bodies under the limit.

**Acceptance checks.**

- Normal `/internal/link/create` and `/internal/bot/start` bodies still work (`apps/bot/src/api/internal.ts:38-47`).
- Oversized bodies close or reject deterministically.
- Logs distinguish invalid JSON from oversized payloads.

### Add timeout budgets to outbound integration calls

**Current behavior.** Yandex OAuth refresh calls `$fetch.raw()` and Yandex API helpers call `$fetch()` without explicit timeout options in the client code (`apps/web/server/utils/ymClient.ts:31-58`, `apps/web/server/utils/ymClient.ts:80-129`). Similar timeout concerns exist anywhere app code calls external services.

**Task.** Add explicit timeout or abort behavior to outbound HTTP calls, starting with Yandex and then extending the pattern to Telegram/MAX setup calls.

**Acceptance checks.**

- External calls fail with bounded latency and clear 502-style errors.
- Token refresh still re-encrypts refreshed access/refresh tokens when Yandex returns them (`apps/web/server/utils/ymClient.ts:60-71`).
- Callers do not hang indefinitely when an integration endpoint stalls.

### Persist MAX polling progress

**Current behavior.** The MAX poller uses module-level `lastUpdateId` and `isPolling` variables (`apps/bot/src/max/poller.ts:6-14`). After each batch, it sets `lastUpdateId` to the current update ID (`apps/bot/src/max/poller.ts:47-53`). A process restart loses that marker.

**Task.** Persist the MAX update offset in the database or another durable store. Decide whether the marker belongs to `Bot`, `Settings`, or a new table.

**Acceptance checks.**

- Restarting the bot does not replay already-processed updates unless MAX API semantics require it.
- Shutdown still stops polling cleanly through `stopMaxPolling()` (`apps/bot/src/max/poller.ts:74-77`).
- Tests cover marker restoration and marker update after a successful batch.

### Make invite-link rate limiting durable or explicit

**Current behavior.** Telegram invite-link creation uses `rateLimitMap`, a module-level `Map` of `channelId` to timestamps, and allows fewer than `MAX_LINKS_PER_MINUTE` entries in a rolling 60-second window (`apps/bot/src/telegram/services/linkService.ts:8-23`). Restarting the bot resets the limiter.

**Task.** Either move rate limiting to a durable/shared store or explicitly document it as best-effort local protection in code comments and operational docs.

**Acceptance checks.**

- A restart does not accidentally bypass the intended production quota, or the limitation is explicit.
- Existing tests for 20 calls per minute and reset after 61 seconds remain valid or are updated to the new store (`apps/bot/tests/services/linkService.test.ts:101-134`).

## P2 — documentation and maintainability tasks

### Document and validate operations scripts

**Current behavior.** `install.sh` creates `.env`, generates a database password, sets `APP_URL`, and starts Docker Compose (`scripts/install.sh:30-62`). `backup.sh` verifies the `postgres` container, dumps the database, and rotates backups older than 30 days (`scripts/backup.sh:17-38`). `restore.sh` prompts before piping a gzipped dump into `psql` (`scripts/restore.sh:25-48`). `update.sh` tries backup, continues on backup failure, pulls `main`, and recreates containers (`scripts/update.sh:12-37`).

**Task.** Create `operations-scripts.md` and decide which script behaviors are intentional. The most important decision is whether update should continue after backup failure.

**Acceptance checks.**

- Each script has prerequisites, side effects, rollback notes, and failure modes.
- Backup retention and restore overwrite behavior are explicit.
- The page links to deployment instead of duplicating Docker Compose basics.

### Split and document source analytics behavior

**Current behavior.** `/api/sources` computes visits, subscribers, conversion percent, and costs using raw SQL over `Visit`, `Subscriber`, and `InviteLink` (`apps/web/server/api/sources/index.get.ts:37-168`). It catches any error and returns an empty source list (`apps/web/server/api/sources/index.get.ts:170-173`). The composable exposes the response as reactive `sources` plus filters (`apps/web/composables/useSources.ts:17-29`).

**Task.** Write a dedicated sources component page before changing attribution reporting. Then decide whether empty-on-error is acceptable or should become a surfaced API error.

**Acceptance checks.**

- The page describes `period`, `channelId`, source rows, and cost fields.
- Failure behavior is documented or changed with tests.
- Manual-link cost aggregation remains aligned with report data semantics.

### Add CI-quality test coverage for API and jobs

**Current behavior.** Tests exist for formatting utilities, attribution dispatch/matching, shared crypto, and shared validation (`apps/web/tests/utils/format.test.ts:1-91`, `apps/bot/tests/attribution/maxMatcher.test.ts:21-158`, `packages/shared/tests/crypto.test.ts:3-53`, `packages/shared/tests/validation.test.ts:8-150`). The web Vitest config uses a Node environment and an alias for `@ps/shared` (`apps/web/vitest.config.ts:7-29`).

**Task.** Add a `testing.md` page and then add tests for routes or jobs that currently depend on manual verification. Prioritize public report auth, `/api/sources`, and bot internal API parsing.

**Acceptance checks.**

- The testing page states which layers are unit-tested and which require integration tests.
- New tests cover at least one security task and one analytics task.
- `pnpm test` remains the root command for the whole workspace (`package.json:5-15`).

### Document local development topology

**Current behavior.** `docker-compose.dev.yml` builds `dev` targets for web and bot, mounts app/package/prisma source directories, runs filtered dev commands, and exposes PostgreSQL on `5432:5432` (`docker-compose.dev.yml:1-34`). The seed script only upserts `Settings.id = 1` and relies on generated defaults for secrets (`prisma/seed.ts:5-15`).

**Task.** Write `local-development.md` for contributors who need hot reload, local database access, and seed behavior.

**Acceptance checks.**

- The page distinguishes production Compose from development Compose.
- It explains when to run `pnpm db:seed` and why Settings must exist.
- It includes cleanup guidance that avoids deleting production volumes.

## P3 — cleanup tasks

### Replace placeholder lint command

**Current behavior.** Root `lint` delegates to Turbo (`package.json:5-15`), but the web package `lint` script is `echo 'lint placeholder'` (`apps/web/package.json:5-10`).

**Task.** Decide whether to add a real lint setup or remove the lint command from quality claims. Do this before documenting CI as a quality gate.

**Acceptance checks.**

- `pnpm lint` fails on meaningful lint errors or is clearly not a quality gate.
- Documentation does not overstate lint coverage.

## Non-tasks

These are intentionally not active tasks on this page:

| Non-task | Why not here | Where to look |
|---|---|---|
| Rewriting architecture decisions | Architectural decisions are already captured with evidence and should not be duplicated. | [decisions](decisions.md#decision-map) |
| Re-explaining deployment basics | Deployment already covers Compose services and production flow. | [deployment](deployment.md#deployment-flow) |
| Listing every API route | The API surface is already cataloged elsewhere. | [components/api](components/api.md#public-api) |
| Re-listing known production gotchas | Incident-style problem, risk, and workaround entries belong in the gotchas page. | [gotchas](gotchas.md#critical--data-loss--security) |

## How to pick up a task

1. Start with the evidence files in the task row.
2. Check the linked component page for local invariants before editing.
3. Add or update tests when a task changes behavior; current test entry points include workspace `pnpm test` and package Vitest configs (`package.json:5-15`, `apps/web/vitest.config.ts:25-28`).
4. Update the relevant wiki page after code changes so this backlog remains a snapshot, not stale project management data.

## See also

- [gaps: documentation debt by future task](gaps.md#documentation-debt-by-future-task) — missing pages and thin coverage areas.
- [components/web: gotchas](components/web.md#gotchas) — web-specific sharp edges behind several tasks.
- [components/bot: internal API](components/bot.md#internal-api) — bot-side entry points for request-size and startup tasks.
- [components/max: polling loop](components/max.md#polling-loop) — MAX polling details for durable offset work.

## Backlinks

- [integrations](./components/integrations.md)
- [max](./components/max.md)
- [gaps](./gaps.md)
