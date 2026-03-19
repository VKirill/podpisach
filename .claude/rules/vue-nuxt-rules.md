---
paths:
  - "apps/web/components/**"
  - "apps/web/pages/**"
  - "apps/web/composables/**"
  - "apps/web/layouts/**"
---

# Vue / Nuxt Rules

- Vue 3 Composition API + `<script setup lang="ts">` — ВСЕГДА
- Компоненты PascalCase: `StatsCard.vue`, `ChannelList.vue`
- Composables camelCase с `use`: `useAuth.ts`, `useChannels.ts`
- Nuxt UI компоненты — приоритет перед самописными (UButton, UTable, UCard, UModal)
- Файловая маршрутизация Nuxt: pages/ → URL. Динамические: `[id].vue`, `[token].vue`
- Четыре layout'а: `default` (sidebar), `auth` (логин), `setup` (wizard), `report` (public)
- Auto-imports Nuxt: не нужны явные импорты `ref`, `computed`, `useFetch` и composables
- Nuxt UI icons: `i-lucide-*` prefix (Lucide иконки)
