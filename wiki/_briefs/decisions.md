## Brief: decisions.md

Focus: ADRs — each decision cites a commit hash from git history. Convert the commits below into 8-15 proper ADR entries.

Files to read first:
- `wiki/_git-signals.md` (full pre-computed git log, curated by pipeline)

Pre-fetched candidate commits (filtered by arch-relevant keywords):
```
7e02658 feat: single-line tracking script installation
76a6bba refactor: rename @op/shared → @ps/shared, fix CI and sources API
2e69bef feat(INT-1): Yandex Metrika integration — OAuth, counters, goals, conversions
0b0517c feat(bot): add MAX Bot API client, long polling, and event handlers
8d35dec feat(RPT-1): публичные отчёты для клиентов — read-only дашборд + пароль
4a0baa9 feat(web): WEB-10 — JS script generator page with ScriptGenerator and ScriptTester components
a7f9840 feat(dashboard): WEB-4 stats overview, chart, events feed, top sources
3ab3626 feat(bot): add Correlator — visit-to-subscription attribution (TG exact + MAX probabilistic)
9dd7f94 feat(API-1): Nitro Server API — auth, setup, settings, channels CRUD
5337aea feat(bot): BOT-1 Telegram bot grammY + ChatMemberUpdated handlers
4b53c91 feat(web): scaffold Nuxt 4 app with Nuxt UI, layouts, pages, and shared components
44b26b5 feat(shared): create @op/shared package with types, constants, validation, crypto
a00dea1 feat(prisma): add full database schema, seed script, and prisma config
15c7f1c feat(INIT-1): initialize monorepo with Turborepo + pnpm workspaces
e13d77c Initial commit: PROJECT.md from architect
```

Pick 8-15 that represent distinct architectural choices — each becomes one ADR. Merge duplicates.


Format per ADR: **## ADR-NNN: Title** → Context / Decision / Status (accepted | superseded | deprecated) / Evidence (commit hash).

Do NOT invent decisions — only document what git history actually shows.

Target: 8-15 ADRs, ~10-20 KB total.
