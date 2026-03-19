<script setup lang="ts">
import { NAV_ITEMS } from '~/utils/constants'

const route = useRoute()
const colorMode = useColorMode()

const pageTitle = computed(() => {
  const matched = NAV_ITEMS.find(item => item.to === route.path)
  if (matched) return matched.label
  if (route.path.startsWith('/channels/')) return 'Канал'
  if (route.path.startsWith('/r/')) return 'Публичный отчёт'
  return 'ПодписачЪ'
})

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <header class="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <h1 class="font-semibold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
    <UButton
      :icon="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
      color="neutral"
      variant="ghost"
      aria-label="Переключить тему"
      @click="toggleColorMode"
    />
  </header>
</template>
