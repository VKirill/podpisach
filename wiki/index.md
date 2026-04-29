---
title: Wiki Index
created: 2026-04-29
updated: 2026-04-29
status: active
tags: [index, catalog]
---

# ПодписачЪ — Wiki Index

Auto-generated catalog. Each entry has keywords an agent can match against a task description — open the page whose description best covers what you are doing.

## Pages

- [Active Areas](active-areas.md) — Churn hotspots covering Docker, Prisma 7 migrations, Nuxt hydration, shared contracts, and tracking.
- [Active Tasks](active-tasks.md) — Actionable queue for security and reliability tasks: report cookies, GA secrets, bot API limits.
- [System Architecture](architecture.md) — System architecture for Nuxt web, bot worker, PostgreSQL authority, shared contracts, and attribution.
- [Data Model](data-model.md) — PostgreSQL Prisma data model for Settings, Channel, Visit, Subscriber, reports, integrations, and conversions.
- [Architecture Decision Records](decisions.md) — Architecture decisions covering pnpm/Turborepo monorepo, PostgreSQL system-of-record, Prisma, and shared contracts.
- [Deploy Podpisach](deployment.md) — Docker Compose deployment for Nuxt app, bot worker, PostgreSQL volume, environment, and troubleshooting.
- [Documentation Gaps](gaps.md) — Documentation gaps and suggested next pages for reports, sources, backup-restore, install scripts, and CI.
- [Gotchas](gotchas.md) — Production landmines for report cookies, GA secrets, Docker volumes, encrypted tokens, and timeouts.
- [Project Overview](overview.md) — Project overview for pnpm/Turbo monorepo, Nuxt admin, bot process, attribution, and persistence.

## components/

- [Web API Component](components/api.md) — Nuxt/Nitro API routes for auth, setup, tracking, reports, integrations, and route conventions.
- [Attribution Component](components/attribution.md) — Attribution flow linking Visit to Subscriber through Telegram invite evidence and MAX correlation.
- [Bot Application Component](components/bot.md) — Bot worker runtime for Telegram polling, MAX polling, invite links, attribution, and jobs.
- [Configuration Component](components/config.md) — Configuration lifecycle for env variables, Settings row, encrypted credentials, web and bot consumers.
- [Integrations](components/integrations.md) — Analytics integrations for Yandex Metrika OAuth/counters and Google Analytics conversion delivery.
- [Jobs](components/jobs.md) — Bot cron jobs for Telegram invite cleanup, subscriber-count sync, and conversion retry.
- [MAX Integration](components/max.md) — MAX integration long polling, update handling, user_added events, and visit-based attribution.
- [Shared Package](components/shared.md) — @ps/shared package contracts for TypeScript types, constants, Zod schemas, and AES-GCM crypto.
- [Telegram Integration](components/telegram.md) — Telegram integration for bot polling, invite-link lifecycle, chat_member updates, and subscriber attribution.
- [Web Component](components/web.md) — Nuxt web component serving admin SPA, public reports, tracking endpoint, and Nitro APIs.
