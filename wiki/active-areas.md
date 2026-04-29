---
title: Active Areas
type: reference
created: 2026-04-29
updated: 2026-04-29
status: active
confidence: medium
tags: [active-areas, churn, maintenance]
sources:
  - .git/logs/HEAD
  - apps/web/nuxt.config.ts
  - apps/web/assets/css/main.css
  - apps/web/components/setup/SetupWizard.vue
  - apps/web/server/utils/session.ts
  - apps/web/docker-entrypoint.sh
  - apps/bot/Dockerfile
  - apps/web/Dockerfile
  - prisma.config.ts
  - prisma/schema.prisma
  - prisma/migrations/0001_init/migration.sql
  - packages/shared/package.json
  - packages/shared/src/index.ts
  - apps/web/pages/script.vue
  - apps/web/components/script/ScriptGenerator.vue
  - apps/web/components/script/ScriptTester.vue
  - apps/web/server/api/track/index.post.ts
  - apps/web/server/api/track/index.options.ts
  - apps/web/server/api/sources/index.get.ts
  - apps/web/server/api/integrations/ga/index.post.ts
  - apps/web/server/api/stats/export.get.ts
---

# Active Areas

These are the hot parts of the codebase right now, ranked by recent commit density and current churn risk.

> [!NOTE]
> The requested `wiki/_git-signals.md` file is not present on disk. This page uses `.git/logs/HEAD` as the available git signal source and current code evidence for each hot area (`.git/logs/HEAD:75-96`).

## Churn ranking

| Rank | Hot area | Recent commits | Why it is hot | Avoid refactoring right now |
|---:|---|---|---|---|
| 1 | Docker, Prisma 7, migrations, first-run startup | `674bd6d`, `d03024e`, `fe4fa59`, `45f218f`, `c372cf8`, `f2511cf`, `1fd2eed`, `5f3e08f`, `4dc239b`, `d21ddc4` | Ten consecutive fixes touched container builds, Prisma configuration, migration SQL, and settings initialization (`.git/logs/HEAD:76-86`). | Do not reorganize Dockerfiles, Prisma config, or entrypoint settings initialization while deployment remains this active. |
| 2 | Nuxt hydration, UI boot, CSS, session cookie behavior | `a2b7fd4`, `7557b4e`, `b99fd73`, `20fefb2`, `ddfa5cc`, `4702c84` | Six fixes in a row addressed hydration, SPA mode, component auto-imports, Nuxt UI styles, and cookie Secure behavior (`.git/logs/HEAD:87-92`). | Do not enable SSR, rename setup components, or change global CSS/session-cookie rules as a drive-by cleanup. |
| 3 | Shared package rename and generated tracking script | `76a6bba`, `7e02658` | The latest feature work renamed the shared package and added single-line tracking script installation (`.git/logs/HEAD:93-94`). | Do not move `@ps/shared` exports or tracking payload fields without checking web, bot, and script generator together. |
| 4 | Documentation reset / generated wiki state | `79840fd`, `a88e0df` | The two most recent commits are documentation-generation and reset work (`.git/logs/HEAD:95-96`). | Do not treat generated docs/config churn as product behavior without confirming code. |
| 5 | Reporting and export hardening | `9cb9691`, `8d35dec` from pipeline briefs | Recent fix/feature history names subscribers API, CSV export, and public reports as changed areas. Current code still contains raw SQL and visibility logic in report/source/export paths. | Do not rewrite reporting SQL while public-report visibility and CSV safety are still easy to regress. |

## 1. Docker, Prisma 7, migrations, and first-run startup

This is the hottest area. The HEAD log shows a cluster of deployment fixes: pnpm/node_modules copy behavior, Docker `DATABASE_URL`, Prisma 7 config, Prisma Client initialization, initial migration, migration SQL cleanup, and auto-creating `Settings` in the web entrypoint (`.git/logs/HEAD:76-86`).

Current code confirms the moving parts are tightly coupled. The web image copies Nuxt output, `node_modules`, Prisma schema/migrations/config, then runs an entrypoint (`apps/web/Dockerfile:41-60`). The bot image copies compiled `dist`, `packages/shared`, `node_modules`, Prisma files, and its entrypoint (`apps/bot/Dockerfile:41-69`). Prisma config uses a placeholder URL when `DATABASE_URL` is absent during Docker build (`prisma.config.ts:9-13`). The web entrypoint runs `prisma migrate deploy` and then upserts `Settings(id=1)` (`apps/web/docker-entrypoint.sh:10-26`).

**What is in flight:** the team has been stabilizing production boot and Prisma 7 behavior. The initial migration creates all enums, tables, indexes, and foreign keys (`prisma/migrations/0001_init/migration.sql:1-382`). `schema.prisma` still keeps the datasource clean and PostgreSQL-only (`prisma/schema.prisma:1-7`).

**Avoid refactoring:** do not move migration execution out of the web entrypoint, delete the placeholder URL, or simplify Docker copy steps without building both images. See [deployment](deployment.md#steps) for the operator path and [gotchas](gotchas.md#bot-and-web-both-wait-for-postgres-but-only-web-runs-migrations) for startup traps.

## 2. Nuxt hydration, CSS, setup wizard, and cookie security

The HEAD log shows six consecutive frontend/runtime fixes: hydration mismatch, removing a transition wrapper, disabling SSR, Nuxt auto-import component names, Nuxt UI CSS import, and cookie Secure behavior based on `APP_URL` (`.git/logs/HEAD:87-92`). This is active because small framework changes can break first-run setup or login.

Current code keeps SSR disabled in Nuxt config (`apps/web/nuxt.config.ts:2-5`). Global CSS imports both Tailwind and Nuxt UI (`apps/web/assets/css/main.css:1-2`). Setup wizard step components use prefixed auto-import names like `SetupStepPassword` and `SetupStepBot` (`apps/web/components/setup/SetupWizard.vue:5-11`). Session cookies set `secure` based on whether `NUXT_PUBLIC_APP_URL` starts with `https` (`apps/web/server/utils/session.ts:13-19`).

**What is in flight:** the admin UI has been adjusted around Nuxt runtime assumptions rather than product UX alone. The code intentionally favors SPA mode and exact component names.

**Avoid refactoring:** do not re-enable SSR, wrap setup steps in transitions, rename setup components to unprefixed tags, or remove either CSS import unless you test first-run setup and login. See [gotchas](gotchas.md#ssr-must-stay-disabled-unless-hydration-is-re-tested) for the specific regression risks.

## 3. Shared contracts and tracking-script installation

The latest feature commits rename the shared package and add single-line tracking script installation (`.git/logs/HEAD:93-94`). This area is hot because it spans package exports, admin UI, public tracking, CORS, and source analytics.

`@ps/shared` exports root types, constants, validation, and crypto subpaths (`packages/shared/package.json:5-27`, `packages/shared/src/index.ts:1-4`). The script page is an authenticated admin page that renders a generator and tester around a selected channel (`apps/web/pages/script.vue:1-22`). The generator builds an install snippet from `config.public.appUrl`, the selected channel ID, and the `data-ps-subscribe` attribute (`apps/web/components/script/ScriptGenerator.vue:4-43`). It also warns when `APP_URL` contains localhost (`apps/web/components/script/ScriptGenerator.vue:45-104`).

The tester calls `/api/track` with a test UTM source and optional URL, then reports whether an invite URL came back (`apps/web/components/script/ScriptTester.vue:14-45`, `apps/web/components/script/ScriptTester.vue:80-112`). The tracking endpoint permits cross-origin POSTs and creates visits before optional Telegram invite-link creation (`apps/web/server/api/track/index.post.ts:4-13`, `apps/web/server/api/track/index.post.ts:29-73`). The OPTIONS endpoint returns matching CORS headers (`apps/web/server/api/track/index.options.ts:1-8`).

**What is in flight:** tracking installation is becoming a user-facing integration surface, not just an API endpoint.

**Avoid refactoring:** do not change `TrackPayload`, `TrackResponse`, `@ps/shared` subpath exports, `/api/track` CORS, or generated snippet shape without testing the script page and external landing-page behavior. See [data model](data-model.md#visit-attribution-and-subscribers) for how visits and subscribers connect.

## 4. Generated documentation and agent configuration churn

The two newest HEAD entries are documentation-generation and reset commits (`.git/logs/HEAD:95-96`). This is active in process terms, not runtime terms.

**What is in flight:** the repository is being re-documented and re-actualized after code changes. The wiki pages should point agents to code, not to generated docs as source of truth.

**Avoid refactoring:** do not edit runtime code just to match generated documentation wording. If a generated page conflicts with code, prefer the code and update the page later.

> [!IMPORTANT]
> Do not use `PROJECT.md`, `README.md`, `.claude/CLAUDE.md`, or existing wiki pages as primary evidence for product behavior. This page cites code and git logs instead.

## 5. Reporting, source analytics, and CSV export

The task-provided recent-fix list names `9cb9691 fix: review fixes for subscribers API and CSV export`, while earlier feature work included public reports. Current source code shows this area still has many hand-written SQL and visibility rules.

The sources endpoint aggregates visits, subscribers, conversion percentage, and manual-link costs using raw SQL with optional period/channel filters (`apps/web/server/api/sources/index.get.ts:37-103`, `apps/web/server/api/sources/index.get.ts:105-168`). It catches query failures, logs them, and returns an empty source list (`apps/web/server/api/sources/index.get.ts:170-173`). CSV export protects against spreadsheet formula injection before quoting values (`apps/web/server/api/stats/export.get.ts:9-19`). It fetches up to 50,000 subscribers and buffers CSV rows in memory (`apps/web/server/api/stats/export.get.ts:40-61`, `apps/web/server/api/stats/export.get.ts:73-97`).

**What is in flight:** reporting is being hardened around source metrics, cost metrics, and export safety.

**Avoid refactoring:** do not consolidate source-report SQL, change CSV escaping, or remove the 50,000-row cap without adding tests. See [gotchas](gotchas.md#csv-export-caps-results-at-50000-rows-without-pagination) for the export limit.

## Practical rules for agents

1. **Touch hot areas narrowly.** If your task is not about Docker/Prisma, avoid Dockerfiles, `prisma.config.ts`, migrations, and entrypoints (`.git/logs/HEAD:76-86`).
2. **Test setup after UI framework edits.** SSR, setup step names, CSS imports, and cookie scheme logic have recent regressions (`.git/logs/HEAD:87-92`).
3. **Treat tracking as an external contract.** The generated snippet, CORS endpoint, and `/api/track` payload now form a landing-page integration (`apps/web/components/script/ScriptGenerator.vue:25-43`, `apps/web/server/api/track/index.post.ts:4-13`).
4. **Prefer adding tests before reporting rewrites.** Source analytics and CSV export use raw SQL and string escaping that are easy to break (`apps/web/server/api/sources/index.get.ts:37-173`, `apps/web/server/api/stats/export.get.ts:9-97`).

## See also

- [gotchas](gotchas.md#high--infrastructure--stability) — risks in the same hot areas.
- [deployment](deployment.md#troubleshooting) — operational symptoms for Docker, Prisma, and startup problems.
- [data model](data-model.md#indexes-and-query-paths) — schema/query paths behind source analytics and reports.
- [components/web (planned)](components/web.md) — detailed Nuxt/API surface.
- [components/shared (planned)](components/shared.md) — shared contract API.

## Backlinks

- [shared](./components/shared.md)
- [web](./components/web.md)
