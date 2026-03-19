---
name: vue-developer
description: Vue 3 + Nuxt 3 development. Composition API, script setup, TypeScript, Pinia, Vue Router, SSR patterns.
user-invocable: false
references: references/REFERENCE.md
---

# Vue 3 + Nuxt 3 Developer

## Vue 3 Core

### Script Setup (default)

Always use `<script setup lang="ts">` — it's the recommended syntax for Vue 3 SFCs.

```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)

watch(count, (newVal, oldVal) => {
  console.log(`changed: ${oldVal} → ${newVal}`)
})

onMounted(() => {
  console.log('component mounted')
})
</script>

<template>
  <button @click="count++">{{ doubled }}</button>
</template>
```

### Reactivity

| API | Use case |
|-----|----------|
| `ref()` | Primitives and single values |
| `reactive()` | Objects/arrays (no `.value` needed) |
| `computed()` | Derived state (cached, read-only by default) |
| `watch()` | Side effects on state change |
| `watchEffect()` | Auto-tracking side effects |
| `shallowRef()` | Large objects where deep reactivity is expensive |
| `toRefs()` | Destructure reactive object keeping reactivity |

Rules:
- Prefer `ref()` over `reactive()` — consistent `.value` access, works with primitives
- `computed()` must be pure — no side effects
- Use `watch` with explicit sources over `watchEffect` when you need oldValue
- Never destructure `reactive()` directly — use `toRefs()` or `storeToRefs()` for Pinia

### Props & Emits (TypeScript)

```vue
<script setup lang="ts">
// Props with type-only declaration
const props = defineProps<{
  title: string
  count?: number
  items: string[]
}>()

// Props with defaults
const props = withDefaults(defineProps<{
  title: string
  count?: number
}>(), {
  count: 0,
})

// Emits with type-only declaration
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()

// v-model (Vue 3.4+)
const modelValue = defineModel<string>()
const title = defineModel<string>('title')
</script>
```

### Slots

```vue
<!-- Parent -->
<MyComponent>
  <template #header="{ title }">
    <h1>{{ title }}</h1>
  </template>
  <template #default>
    <p>Default content</p>
  </template>
</MyComponent>

<!-- Child -->
<script setup lang="ts">
defineSlots<{
  header(props: { title: string }): any
  default(): any
}>()
</script>
<template>
  <header><slot name="header" :title="pageTitle" /></header>
  <main><slot /></main>
</template>
```

### Provide / Inject

```ts
// types.ts
import type { InjectionKey } from 'vue'
export const UserKey: InjectionKey<User> = Symbol('user')

// Provider component
import { provide } from 'vue'
import { UserKey } from './types'
provide(UserKey, currentUser)

// Consumer component
import { inject } from 'vue'
import { UserKey } from './types'
const user = inject(UserKey) // typed as User | undefined
const user = inject(UserKey, defaultUser) // typed as User
```

### Composables

Composables are the primary code reuse pattern in Vue 3.

```ts
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)
  const doubled = computed(() => count.value * 2)

  function increment() { count.value++ }
  function reset() { count.value = initial }

  return { count, doubled, increment, reset }
}
```

Rules:
- Name: `use` + PascalCase (`useCounter`, `useFetch`)
- Return reactive refs, not raw values
- Accept refs or getters as arguments for reactivity: `(url: MaybeRefOrGetter<string>)`
- Use `toValue()` to unwrap MaybeRefOrGetter
- Handle cleanup in `onUnmounted` or return a cleanup function
- Composables must be called in `setup()` scope (not conditionally)

## Pinia (State Management)

```ts
// stores/user.ts — Setup Store syntax (recommended)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // state
  const name = ref('')
  const items = ref<Item[]>([])

  // getters
  const itemCount = computed(() => items.value.length)

  // actions
  async function fetchItems() {
    items.value = await api.getItems()
  }

  return { name, items, itemCount, fetchItems }
})
```

Rules:
- One store per domain entity
- Setup Store syntax (function) > Options syntax
- Destructure with `storeToRefs()` to keep reactivity: `const { name } = storeToRefs(store)`
- Actions can be async
- Never mutate store state directly from components — use actions

## Vue Router

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/Home.vue') },
    {
      path: '/user/:id',
      component: () => import('./pages/User.vue'),
      props: true, // pass params as props
      meta: { requiresAuth: true },
    },
  ],
})

// Navigation guard
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return '/login'
  }
})
```

In components:
```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// reactive param access
const userId = computed(() => route.params.id as string)

// programmatic navigation
router.push({ name: 'user', params: { id: '123' } })
</script>
```

## Nuxt 3

### Auto-imports

Nuxt 3 auto-imports Vue APIs, composables, and components. No manual imports needed for:
- `ref`, `computed`, `watch`, `onMounted` (Vue)
- `useFetch`, `useAsyncData`, `useRoute`, `useRouter`, `useState` (Nuxt)
- Components from `components/` directory
- Composables from `composables/` directory

### Data Fetching

```vue
<script setup lang="ts">
// useFetch — convenience wrapper for API calls
const { data: posts, status, error, refresh } = await useFetch('/api/posts')

// useAsyncData — when you need custom fetching logic
const { data: post } = await useAsyncData('post', () => {
  return $fetch(`/api/posts/${route.params.id}`)
})

// Lazy fetch — doesn't block navigation
const { data: comments } = useLazyFetch(`/api/posts/${id}/comments`)
</script>
```

Rules:
- `useFetch`/`useAsyncData` must be called in setup or lifecycle hooks (not in event handlers)
- Use unique keys for `useAsyncData` to enable caching and deduplication
- Use `$fetch` for event-triggered requests (click handlers, form submits)
- Use `refresh()` to refetch data without full page reload
- Use `lazy: true` for non-critical data

### Server Routes

```ts
// server/api/posts.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event) // ?page=1&limit=10
  return await db.posts.findMany({
    take: Number(query.limit) || 10,
    skip: Number(query.page) || 0,
  })
})

// server/api/posts.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await db.posts.create(body)
})

// server/api/posts/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return await db.posts.findById(id)
})
```

### Middleware

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useUserState()
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})

// Usage in page: definePageMeta({ middleware: 'auth' })
```

### App Config & Runtime Config

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    secretKey: '', // server-only (from env NUXT_SECRET_KEY)
    public: {
      apiBase: '/api', // exposed to client (from env NUXT_PUBLIC_API_BASE)
    },
  },
})

// In composables/server:
const config = useRuntimeConfig()
config.secretKey // server-only
config.public.apiBase // both
```

## Anti-Patterns

- **Options API** — always use Composition API with `<script setup>`
- **this** — doesn't exist in `<script setup>`, use refs and composables
- **Mutating props** — emit events or use `defineModel()` instead
- **Watchers for derived state** — use `computed()` instead of `watch` + `ref`
- **Index as key** in `v-for` — use unique IDs: `v-for="item in items" :key="item.id"`
- **Reactive destructuring** — `const { x } = reactive({x: 1})` loses reactivity, use `toRefs()`
- **Mixing Pinia patterns** — pick Setup Store syntax, don't mix with Options syntax in same project
- **Non-lazy route imports** — always use `() => import()` for route components


## API Reference

Detailed API documentation: [references/REFERENCE.md](references/REFERENCE.md).

**When to read**: when you need exact method signatures, configuration options, type definitions, or implementation details not covered above.

**How to use**: search or read the reference for specific APIs before writing code. Don't read the entire file — look up only what you need.
