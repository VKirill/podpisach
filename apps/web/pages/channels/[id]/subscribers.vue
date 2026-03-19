<script setup lang="ts">
import { useSubscribers } from '~/composables/useSubscribers'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const channelId = computed(() => route.params.id as string)

const { subscribers, total, page, sources, status, search, source, loading } =
  useSubscribers(channelId)

const selectedSubscriberId = ref<number | null>(null)

function exportCsv(): void {
  window.open(`/api/stats/export?channelId=${channelId.value}&status=${status.value}`)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Заголовок -->
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-xl font-semibold">Подписчики</h2>
      <UButton
        icon="i-heroicons-arrow-down-tray"
        variant="outline"
        size="sm"
        @click="exportCsv"
      >
        Экспорт CSV
      </UButton>
    </div>

    <!-- Фильтры -->
    <SubscriberFilters
      v-model:status="status"
      v-model:search="search"
      v-model:source="source"
      :sources="sources"
    />

    <!-- Таблица -->
    <template v-if="subscribers.length || loading">
      <SubscriberTable
        :subscribers="subscribers"
        :total="total"
        :page="page"
        :loading="loading"
        @select="selectedSubscriberId = $event.id"
        @update:page="page = $event"
      />
    </template>

    <EmptyState
      v-else
      icon="i-heroicons-users"
      title="Подписчиков не найдено"
      :description="search || source || status !== 'all'
        ? 'Попробуйте изменить фильтры поиска'
        : 'Подписчики появятся здесь после первых переходов по ссылкам'"
    />

    <!-- Детали подписчика -->
    <SubscriberDetail
      :subscriber-id="selectedSubscriberId"
      @close="selectedSubscriberId = null"
    />
  </div>
</template>
