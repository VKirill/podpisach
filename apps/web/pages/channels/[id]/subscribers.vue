<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const channelId = computed(() => route.params.id as string)
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-users"
      :title="`Подписчики канала #${channelId}`"
      description="Здесь будет таблица подписчиков с UTM-метками, источниками и точностью атрибуции."
    />
  </div>
</template>
