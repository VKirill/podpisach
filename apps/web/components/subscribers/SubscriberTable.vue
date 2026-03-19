<script setup lang="ts">
import type { Subscriber } from '~/composables/useSubscribers'
import { formatRelativeDate } from '~/composables/useSubscribers'

interface Props {
  subscribers: Subscriber[]
  total: number
  page: number
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [subscriber: Subscriber]
  'update:page': [page: number]
}>()

const columns = [
  { id: 'user', header: 'Пользователь' },
  { id: 'source', header: 'Источник' },
  { id: 'date', header: 'Дата подписки' },
  { id: 'status', header: 'Статус' },
  { id: 'confidence', header: 'Уверенность' },
]

type BadgeColor = 'success' | 'error' | 'neutral' | 'warning'

const statusConfig: Record<string, { label: string; color: BadgeColor }> = {
  active: { label: '🟢 Активен', color: 'success' },
  left: { label: '🔴 Ушёл', color: 'error' },
  kicked: { label: '⚫ Исключён', color: 'neutral' },
  banned: { label: '⛔ Заблокирован', color: 'warning' },
}

function displayName(sub: Subscriber): string {
  const parts = [sub.firstName, sub.lastName].filter(Boolean)
  return parts.length ? parts.join(' ') : `ID: ${sub.platformUserId}`
}

function handleSelect(row: Subscriber): void {
  emit('select', row)
}
</script>

<template>
  <div class="space-y-4">
    <UTable
      :data="subscribers"
      :columns="columns"
      :loading="loading"
      class="cursor-pointer"
      @select="handleSelect"
    >
      <template #user-cell="{ row }">
        <div class="flex flex-col gap-0.5 py-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">{{ displayName(row.original) }}</span>
            <PlatformBadge :platform="row.original.platform" />
          </div>
          <span v-if="row.original.username" class="text-xs text-gray-500 dark:text-gray-400">
            @{{ row.original.username }}
          </span>
        </div>
      </template>

      <template #source-cell="{ row }">
        <span class="text-sm">
          {{ row.original.visit?.utmSource ?? 'Прямой' }}
        </span>
      </template>

      <template #date-cell="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ formatRelativeDate(row.original.subscribedAt) }}
        </span>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :label="statusConfig[row.original.status]?.label ?? row.original.status"
          :color="statusConfig[row.original.status]?.color ?? 'neutral'"
          variant="subtle"
          size="sm"
        />
      </template>

      <template #confidence-cell="{ row }">
        <ConfidenceBadge :confidence="row.original.attributionConfidence" />
      </template>
    </UTable>

    <div v-if="total > 50" class="flex justify-center">
      <UPagination
        :page="page"
        :total="total"
        :items-per-page="50"
        @update:page="$emit('update:page', $event)"
      />
    </div>
  </div>
</template>
