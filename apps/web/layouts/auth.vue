<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <div class="w-full max-w-sm">
      <!-- Логотип -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-4">
          <span class="text-white font-bold text-lg">ОП</span>
        </div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Откуда подписчик</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Self-hosted атрибуция подписчиков</p>
      </div>

      <UCard>
        <slot />
      </UCard>
    </div>
  </div>
</template>
