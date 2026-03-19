<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const channelId = computed(() => route.params.id as string)
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-chart-bar"
      :title="`Канал #${channelId}`"
      description="Здесь будет обзор канала: статистика подписок, источники трафика и последние события."
    />
  </div>
</template>
