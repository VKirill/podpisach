<script setup lang="ts">
definePageMeta({ layout: 'auth' })
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Вход</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Введите пароль для доступа к дашборду</p>

    <EmptyState
      icon="i-heroicons-lock-closed"
      title="Форма входа"
      description="Coming soon"
    />
  </div>
</template>
