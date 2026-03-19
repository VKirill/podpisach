<script setup lang="ts">
import { NAV_ITEMS, APP_VERSION } from '~/utils/constants'

const { logout } = useAuth()
</script>

<template>
  <div class="flex flex-col h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <!-- Логотип -->
    <div class="flex items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-800">
      <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <span class="text-white font-bold text-sm">ОП</span>
      </div>
      <div class="min-w-0">
        <p class="font-semibold text-sm text-gray-900 dark:text-white truncate">Откуда подписчик</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">v{{ APP_VERSION }}</p>
      </div>
    </div>

    <!-- Навигация -->
    <nav class="flex-1 px-2 py-4 overflow-y-auto">
      <UNavigationMenu
        :items="NAV_ITEMS"
        orientation="vertical"
        class="w-full"
      />
    </nav>

    <!-- Выход -->
    <div class="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-heroicons-arrow-right-on-rectangle"
        class="w-full justify-start"
        @click="logout"
      >
        Выйти
      </UButton>
    </div>
  </div>
</template>
