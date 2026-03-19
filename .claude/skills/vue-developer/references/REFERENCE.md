# Vue 3 + Nuxt 3 — Advanced Reference

## Pinia Advanced Patterns

### Store Composition (stores using other stores)

```ts
// stores/cart.ts
import { defineStore } from 'pinia'
import { useUserStore } from './user'

export const useCartStore = defineStore('cart', () => {
  const userStore = useUserStore()
  const items = ref<CartItem[]>([])

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + i.price * i.qty, 0)
  )

  const discountedTotal = computed(() => {
    const discount = userStore.isPremium ? 0.9 : 1
    return total.value * discount
  })

  async function checkout() {
    if (!userStore.isAuthenticated) throw new Error('Login required')
    await api.checkout({ items: items.value, userId: userStore.id })
    items.value = []
  }

  return { items, total, discountedTotal, checkout }
})
```

### Pinia Plugins

```ts
// plugins/pinia-logger.ts
import type { PiniaPlugin } from 'pinia'

export const piniaLogger: PiniaPlugin = ({ store }) => {
  store.$onAction(({ name, args, after, onError }) => {
    console.log(`[${store.$id}] ${name}`, args)
    after((result) => console.log(`[${store.$id}] ${name} done`, result))
    onError((error) => console.error(`[${store.$id}] ${name} failed`, error))
  })
}

// main.ts
pinia.use(piniaLogger)
```

### Persisted State

```ts
// stores/settings.ts
export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('light')
  const locale = ref('en')

  // Restore from localStorage on init
  const saved = localStorage.getItem('settings')
  if (saved) {
    const data = JSON.parse(saved)
    theme.value = data.theme ?? 'light'
    locale.value = data.locale ?? 'en'
  }

  // Auto-save on change
  watch([theme, locale], () => {
    localStorage.setItem('settings', JSON.stringify({
      theme: theme.value,
      locale: locale.value,
    }))
  })

  return { theme, locale }
})
```

## Vue Router Advanced

### Route-level code splitting with loading states

```ts
const routes = [
  {
    path: '/dashboard',
    component: () => import('./pages/Dashboard.vue'),
    meta: { requiresAuth: true, title: 'Dashboard' },
    children: [
      { path: '', redirect: 'overview' },
      { path: 'overview', component: () => import('./pages/DashboardOverview.vue') },
      { path: 'analytics', component: () => import('./pages/DashboardAnalytics.vue') },
    ],
  },
]
```

### Typed Router (vue-router 4.4+)

```ts
// typed-router.d.ts
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
    roles?: ('admin' | 'user')[]
  }
}
```

### Navigation Guards Composition

```ts
// composables/useAuthGuard.ts
export function useAuthGuard() {
  const router = useRouter()
  const userStore = useUserStore()

  router.beforeEach(async (to) => {
    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
    if (to.meta.roles && !to.meta.roles.includes(userStore.role)) {
      return '/forbidden'
    }
  })
}
```

## Nuxt 3 Advanced

### Custom Server Middleware

```ts
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  if (token) {
    try {
      const user = await verifyToken(token)
      event.context.user = user
    } catch {
      deleteCookie(event, 'auth_token')
    }
  }
})
```

### Nuxt Modules

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],
  pinia: {
    storesDirs: ['./stores/**'],
  },
})
```

### Error Handling

```vue
<!-- error.vue (app-level error page) -->
<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const handleClear = () => clearError({ redirect: '/' })
</script>

<template>
  <div>
    <h1>{{ error.statusCode }}</h1>
    <p>{{ error.message }}</p>
    <button @click="handleClear">Go Home</button>
  </div>
</template>
```

```ts
// In composables/pages: throw createError
throw createError({
  statusCode: 404,
  statusMessage: 'Page Not Found',
  fatal: true, // shows error.vue
})
```

### SEO & Head Management

```vue
<script setup lang="ts">
useHead({
  title: 'My Page',
  meta: [
    { name: 'description', content: 'Page description' },
    { property: 'og:title', content: 'My Page' },
  ],
})

useSeoMeta({
  title: 'My Page',
  ogTitle: 'My Page',
  description: 'Page description',
  ogDescription: 'Page description',
  ogImage: '/og-image.png',
})
</script>
```

## Testing Vue Components (Vitest + Vue Test Utils)

```ts
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import Counter from '@/components/Counter.vue'

describe('Counter', () => {
  it('increments on click', async () => {
    const wrapper = mount(Counter, {
      props: { initial: 5 },
      global: {
        plugins: [createTestingPinia({ initialState: { counter: { count: 5 } } })],
      },
    })

    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('6')
  })

  it('emits update event', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update')).toHaveLength(1)
    expect(wrapper.emitted('update')![0]).toEqual([1])
  })
})
```
