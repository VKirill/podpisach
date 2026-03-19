// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  // Fix hydration mismatch: force color-mode to use class without suffix
  colorMode: {
    classSuffix: '',
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Серверные (не публичные)
    databaseUrl: process.env.DATABASE_URL || '',
    botInternalUrl: process.env.BOT_INTERNAL_URL || 'http://bot:3001',
    // Публичные
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  // @nuxt/ui автоматически подключает Tailwind v4 — НЕ добавлять @nuxtjs/tailwindcss
  build: {
    transpile: ['@op/shared', 'jsonwebtoken'],
  },

  // Автоимпорт composables
  imports: {
    dirs: ['composables'],
  },

  devtools: { enabled: true },

  compatibilityDate: '2026-03-19',
})
