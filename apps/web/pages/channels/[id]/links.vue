<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const channelId = computed(() => route.params.id as string)
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-link"
      :title="`Ссылки канала #${channelId}`"
      description="Здесь будут invite-ссылки канала: автоматические (по TTL) и ручные (с затратами)."
    />
  </div>
</template>
