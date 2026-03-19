<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-link"
      title="Интеграции"
      description="Подключите Яндекс Метрику или Google Analytics для отправки конверсий."
    />
  </div>
</template>
