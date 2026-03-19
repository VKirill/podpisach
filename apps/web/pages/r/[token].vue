<script setup lang="ts">
definePageMeta({ layout: 'report' })

const route = useRoute()
const token = computed(() => route.params.token as string)
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-document-chart-bar"
      title="Публичный отчёт"
      description="Дашборд для клиентов: подписки, аналитика, конверсия. Только чтение."
    />
  </div>
</template>
