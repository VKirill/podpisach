<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-cog-6-tooth"
      title="Настройки"
      description="Смена пароля, часовой пояс, окно корреляции для MAX и экспорт данных."
    />
  </div>
</template>
