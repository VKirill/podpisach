# ПодписачЪ

Self-hosted attribution for Telegram and MAX channel subscriptions. The repo is a pnpm/Turborepo monorepo with a Nuxt admin app, a separate bot worker, and a shared contracts package; both runtimes write to one PostgreSQL database through Prisma ([wiki/overview.md](wiki/overview.md)).

**Stack:** Node 22 · Nuxt 4 SPA + Nitro · grammY (Telegram) + MAX polling · PostgreSQL 16 + Prisma 7 · `@ps/shared` (Zod, AES-256-GCM) · pnpm + Turborepo · Docker Compose

> Auto-generated from `wiki/`. Edit the wiki, not this file. Manual edits are overwritten on next derive.

## Critical invariants

Violating any of these causes data loss, downtime, or silent corruption. Read before every code change.

1. **Never run `docker compose down -v`** — the `pgdata` named volume is the only durable store for Settings, encrypted tokens, channels, visits, subscribers, reports, and conversions (`docker-compose.yml:50-62`, [wiki/gotchas.md](wiki/gotchas.md#docker-compose-down--v-deletes-the-only-durable-data-volume)).
2. **`Settings.internalApiSecret` is both auth credential and AES key material.** Rotation must re-encrypt every encrypted bot/integration field in the same migration; otherwise bot startup token decryption breaks (`packages/shared/src/crypto.ts:8-55`, `apps/bot/src/config/index.ts:49-61`, [wiki/gotchas.md](wiki/gotchas.md#rotating-internalapisecret-can-make-encrypted-tokens-unreadable)).
3. **Public report cookie check is presence-only (P0 bug).** A forged `report-session-<token>=1` cookie unlocks password-protected reports — fix before extending report visibility (`apps/web/server/api/reports/[token].get.ts:20-29`, [wiki/active-tasks.md](wiki/active-tasks.md#harden-public-report-password-sessions)).
4. **GA `apiSecret` is stored as plaintext JSON in `Integration.config` (P0 bug).** Use `encrypt(value, settings.internalApiSecret)` like Yandex tokens (`apps/web/server/api/integrations/ga/index.post.ts:10-23`, [wiki/gotchas.md](wiki/gotchas.md#google-analytics-api-secrets-are-stored-in-plaintext-json)).
5. **Schema changes require a checked-in Prisma migration.** `migrate deploy` runs in `apps/web/docker-entrypoint.sh:10-12`; editing only `schema.prisma` will not apply in production ([wiki/gotchas.md](wiki/gotchas.md#migration-sql-is-the-real-deploy-artifact-not-only-schemaprisma)).
6. **Admin APIs are session-protected by default; `/api/internal/**` requires Bearer `internalApiSecret`.** New routes outside `PUBLIC_PREFIXES` get auth automatically (`apps/web/server/middleware/auth.ts:3-29`, `apps/web/server/middleware/internal.ts:3-16`).
7. **Telegram = exact attribution by invite-link URL (confidence 1.0). MAX = probabilistic by fingerprint/IP within `Settings.maxCorrelationWindowSec`.** Do not unify these matchers (`apps/bot/src/attribution/correlator.ts:13-37`, [wiki/decisions.md](wiki/decisions.md#adr-007-attribute-subscriptions-by-platform-specific-matching-strategies)).
8. **Public report visibility filtering happens server-side in `getReportData()`.** Never query report-only fields outside this utility (`apps/web/server/utils/reportData.ts:103-190`).

Full ADRs: [wiki/decisions.md](wiki/decisions.md) (11)
Full sharp edges: [wiki/gotchas.md](wiki/gotchas.md) (4 critical, 7 high)

## Verify changes

```bash
pnpm install                       # workspace install
pnpm typecheck                     # turbo: tsc --noEmit across web, bot, shared
pnpm lint                          # turbo lint (web lint script is a placeholder — see active-tasks)
pnpm test                          # turbo test: vitest in web, bot, packages/shared
pnpm build                         # turbo build: writes .output/** for web, dist/** for bot
pnpm db:generate                   # regenerate Prisma client after schema.prisma edit
```

Tests live in `apps/web/tests/`, `apps/bot/tests/`, `packages/shared/tests/` — utilities, attribution dispatch/matching, shared crypto, shared validation. Route- and job-level integration coverage is a known gap ([wiki/active-tasks.md](wiki/active-tasks.md#add-ci-quality-test-coverage-for-api-and-jobs)).

## Code style

- Validate every external HTTP payload with a Zod schema from `@ps/shared/validation` before any DB write (`packages/shared/src/validation.ts:1-111`).
- Encrypt secrets with `encrypt(value, settings.internalApiSecret)` from `@ps/shared/crypto`; never store bot/integration secrets in plain JSON.
- Use the shared Prisma utility (`apps/web/server/utils/prisma.ts`, `apps/bot/src/utils/prisma.ts`) — Prisma 7 needs `PrismaPg` adapter; do not revert to `datasourceUrl`.
- Keep `Settings` as singleton `id=1`; every lookup uses `where: { id: 1 }`.
- Use Nuxt auto-import-prefixed component names (`SetupStepPassword`, not `StepPassword`) ([wiki/gotchas.md](wiki/gotchas.md#setup-component-names-must-use-nuxt-auto-import-prefixes)).
- Add explicit `timeout` / `AbortSignal.timeout()` to outbound `$fetch` calls (Telegram, MAX, Yandex) — defaults are unbounded.
- `attributionConfidence`: 1.0 Telegram exact, 0.5 Telegram fallback, 0.80 MAX fingerprint, 0.70 MAX IP (`packages/shared/src/constants.ts:34-40`).

## Project map

```
apps/
  web/                       # Nuxt 4 SPA + Nitro API, public port 3000
    nuxt.config.ts           # ssr: false; transpile @ps/shared, jsonwebtoken
    pages/, components/      # admin UI, setup wizard, reports
    server/api/              # Nitro routes (track, links, setup, reports, internal)
    server/middleware/       # auth.ts (session), internal.ts (Bearer)
    server/utils/            # prisma, session, reportData, ymClient
    docker-entrypoint.sh     # wait pg → migrate deploy → upsert Settings → start
  bot/                       # Telegram + MAX worker, internal port 3001
    src/index.ts             # startup: load Settings, polling, jobs
    src/api/internal.ts      # Bearer-auth HTTP API (link/create, bot/start)
    src/telegram/            # grammY bot, member updates, linkService
    src/max/                 # marker-based long polling
    src/attribution/         # correlator, telegramMatcher, maxMatcher
    src/jobs/                # linkCleanup, statsSync, conversionRetry
packages/
  shared/                    # @ps/shared: types, constants, validation, crypto
prisma/
  schema.prisma              # PostgreSQL model; Settings singleton id=1
  migrations/                # checked-in SQL — the real deploy artifact
docker-compose.yml           # app, bot, postgres + pgdata volume
```

## Key symbols

| Symbol | Location | Role |
|---|---|---|
| `POST /api/track` | `apps/web/server/api/track/index.post.ts:1-91` | Tracking ingest: validates, hashes IP, creates Visit, requests TG invite link |
| `POST /api/links` | `apps/web/server/api/links/index.post.ts:1-63` | Manual invite-link creation; rejects non-Telegram channels |
| `auth` middleware | `apps/web/server/middleware/auth.ts:3-29` | Session-gates `/api/**` except public prefixes |
| `internal` middleware | `apps/web/server/middleware/internal.ts:3-16` | Bearer `internalApiSecret` for `/api/internal/**` |
| `getReportData()` | `apps/web/server/utils/reportData.ts:41-191` | Server-side visibility filter for public reports |
| `ymClient` | `apps/web/server/utils/ymClient.ts:20-131` | Yandex Metrika OAuth refresh + offline conversion upload |
| Bot internal API | `apps/bot/src/api/internal.ts:12-62` | `/internal/link/create`, `/internal/bot/start`, `/internal/bot/status` |
| `correlator` | `apps/bot/src/attribution/correlator.ts:6-37` | Routes joins to Telegram/MAX matchers, returns `{visitId, confidence, method}` |
| `linkService` | `apps/bot/src/telegram/services/linkService.ts:36-113` | Auto links: `member_limit=1` + TTL; manual links: no limits |
| `startMaxPolling` | `apps/bot/src/max/poller.ts:10-60` | Marker-based MAX polling (marker not yet persisted) |
| `conversionRetry` job | `apps/bot/src/jobs/conversionRetry.ts:10-158` | Every 10 min, retries pending/failed conversions, max 3 attempts |
| `encrypt` / `decrypt` | `packages/shared/src/crypto.ts:1-55` | AES-256-GCM, format `salt:iv:tag:ciphertext`, key derived from secret |
| `trackPayloadSchema` | `packages/shared/src/validation.ts:7-21` | Zod contract for `/api/track` body |

## Tools

No code-intelligence index configured — use Read/Grep/Glob directly, then fall back to wiki pages for architecture context.

## Wiki protocol

**Always check `wiki/` before answering questions about this project's architecture, patterns, or decisions.**

Every architectural choice, every sharp edge, every in-flight task lives in `wiki/`. The wiki is the single source of truth; this file is a pointer.

### Query order

1. **Wiki semantic search (QMD)** — `qmd query "<concept>" -c podpisach --no-rerank --json` returns top-N wiki pages by hybrid lex+vec match. **Default first step** for any question about architecture, decisions, gotchas, or how something works. HTTP for tools without shell: `GET http://127.0.0.1:9092/wiki/search/podpisach?q=...&limit=10&mode=hybrid`. Falls back silently to grep if QMD CLI is missing.
2. **Direct read** — when QMD points to a page, open it for full context (`wiki/decisions.md`, `wiki/gotchas.md`, etc.). The catalog is `wiki/index.md`.
3. **Grep fallback** — `rg -n "<term>" wiki/` when QMD unavailable.
4. **Code last** — only for line-level details the wiki didn't cover.

### Wiki pages

- [overview.md](wiki/overview.md) — project overview, stack, quick start
- [architecture.md](wiki/architecture.md) — C4 containers, runtime views, invariants
- [decisions.md](wiki/decisions.md) — 11 ADRs with commit evidence
- [gotchas.md](wiki/gotchas.md) — sharp edges (Critical / High / Medium / Low)
- [data-model.md](wiki/data-model.md) — Prisma entities and relationships
- [deployment.md](wiki/deployment.md) — Docker Compose runbook + troubleshooting
- [active-areas.md](wiki/active-areas.md) — modules under recent git activity
- [active-tasks.md](wiki/active-tasks.md) — pipeline tasks snapshot
- [gaps.md](wiki/gaps.md) — undocumented code, open questions
- [components/](wiki/components/) — per-area reference (api, attribution, bot, config, integrations, jobs, max, shared, telegram, web)

Every page has YAML frontmatter with `confidence` (high/medium/low) and `sources:` listing `file:line` evidence. Claims without sources are `low` confidence.

### Planning protocol

Before any non-trivial change:

1. Query wiki — start with `wiki/index.md`, then relevant pages.
2. Synthesize "Past Knowledge": relevant decisions / applicable patterns / known gotchas / reusable components.
3. Check `/home/ubuntu/wiki-master/` for cross-project patterns.
4. Only then plan.

Bug fixes too — `gotchas.md` often names the exact bug you're about to re-encounter.

### Save-on-session-end

After non-trivial work (feature, bug fix, refactor):

1. **Update touched wiki pages** — if behavior in `components/*.md` or `decisions.md` changed, update; `sources:` must still resolve to `file:line`.
2. **Append to `wiki/log.md`** — timestamp, what was done, pages touched, new gaps.
3. **Log new gaps** to `wiki/gaps.md`.
4. **Flag cross-project patterns** under `## cross-project candidates` in `gaps.md`.

Trivial sessions (typo, one-liner) skip this.

### Wiki update flow

Wiki re-derives automatically after every successful dev-orchestrator task, on the WikiFreshness scheduler tick (~5 min), and during the nightly LINT pass.

Manual triggers:
- `POST http://127.0.0.1:9092/wiki/ingest/podpisach?diffMode=worktree` — uncommitted changes
- `POST http://127.0.0.1:9092/wiki/ingest/podpisach?diffMode=committed` — new commits since last ingest
- `POST http://127.0.0.1:9092/entity/wiki/podpisach` — full INIT rewrite (~10 min)

Pipeline runs: wiki updater → QMD re-embed → re-derives this CLAUDE.md / PROJECT.md / README.md.
**Never edit derived files manually** — they get overwritten on next derive. Edit `wiki/` instead.

### Master wiki

`/home/ubuntu/wiki-master/` — cross-project knowledge. Sync runs automatically on every wiki change.

## Behavioral principles

**At the start of any non-trivial task, load `Skill("karpathy-guidelines")`** — mandatory reading.

1. **Think Before Coding** — surface assumptions, ask when unclear.
2. **Simplicity First** — minimum code for the ask, no speculative abstractions.
3. **Surgical Changes** — touch only what you must; match existing style.
4. **Goal-Driven Execution** — verifiable goals, plan multi-step work with checkpoints.

Trivial edits skip the skill load.

## Derive lineage

Built from: `wiki/index.md`, `wiki/overview.md`, `wiki/architecture.md`, `wiki/decisions.md`, `wiki/gotchas.md`, `wiki/active-tasks.md`, `wiki/deployment.md`.

Derive date: `2026-04-29` · snapshot: `9eecf2f5`
