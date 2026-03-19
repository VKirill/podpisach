<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

interface FeedEvent {
  type: string
  subscriberName: string
  channelTitle: string
  source: string | null
  createdAt: string
}

interface EventsResponse {
  events: FeedEvent[]
}

const { data, refresh } = useFetch<EventsResponse>('/api/stats/events', {
  query: { limit: 20 },
})

const events = computed<FeedEvent[]>(() => data.value?.events ?? [])

// Авто-обновление каждые 30 секунд
useIntervalFn(() => refresh(), 30_000)

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ru })
  } catch {
    return iso
  }
}

function eventLabel(type: string): string {
  return type === 'joined' ? ' подписался на ' : ' отписался от '
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">Последние события</h2>
    </template>

    <div v-if="events.length" class="space-y-4">
      <div
        v-for="(event, index) in events"
        :key="index"
        class="flex items-start gap-3"
      >
        <!-- Иконка события -->
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          :class="event.type === 'joined'
            ? 'bg-green-100 dark:bg-green-900/40'
            : 'bg-red-100 dark:bg-red-900/40'"
        >
          <UIcon
            :name="event.type === 'joined' ? 'i-heroicons-user-plus' : 'i-heroicons-user-minus'"
            class="w-4 h-4"
            :class="event.type === 'joined'
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'"
          />
        </div>

        <!-- Текст события -->
        <div class="flex-1 min-w-0">
          <p class="text-sm text-gray-900 dark:text-white leading-snug">
            <span class="font-medium">{{ event.subscriberName }}</span>
            <span class="text-gray-500 dark:text-gray-400">{{ eventLabel(event.type) }}</span>
            <span class="font-medium">{{ event.channelTitle }}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ relativeTime(event.createdAt) }}
            <span v-if="event.source"> · {{ event.source }}</span>
          </p>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="i-heroicons-bell"
      title="Ожидание первых подписчиков..."
      description="События появятся после первых подписок на ваши каналы"
    />
  </UCard>
</template>
