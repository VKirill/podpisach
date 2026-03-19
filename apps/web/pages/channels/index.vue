<script setup lang="ts">
definePageMeta({ layout: 'default' })
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-megaphone"
      title="Каналы"
      description="Здесь будет список подключённых Telegram и MAX каналов. Добавьте первый канал для начала работы."
      action-label="Добавить канал"
      action-to="/channels/new"
    />
  </div>
</template>
