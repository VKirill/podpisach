<script setup lang="ts">
import type { Channel } from '~/composables/useChannels'
import type { Platform } from '@op/shared'

interface Props {
  channels: Channel[]
  loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ add: []; delete: [id: number] }>()

const platformFilter = ref<Platform | 'all'>('all')

const filteredChannels = computed(() => {
  if (platformFilter.value === 'all') return props.channels
  return props.channels.filter(c => c.platform === platformFilter.value)
})

const filterOptions = [
  { label: 'Все', value: 'all' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'MAX', value: 'max' },
]
</script>

<template>
  <div>
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-6 gap-4">
      <USelect
        v-model="platformFilter"
        :items="filterOptions"
        value-key="value"
        label-key="label"
        class="w-40"
      />
      <UButton icon="i-heroicons-plus" @click="emit('add')">
        Добавить канал
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="n in 3" :key="n" class="h-48 rounded-xl" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredChannels.length === 0"
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <UIcon name="i-heroicons-megaphone" class="text-5xl text-gray-300 dark:text-gray-600 mb-4" />
      <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
        {{ channels.length === 0 ? 'Нет подключённых каналов' : 'Нет каналов с таким фильтром' }}
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ channels.length === 0 ? 'Добавьте первый канал для начала работы' : 'Попробуйте изменить фильтр' }}
      </p>
      <UButton v-if="channels.length === 0" icon="i-heroicons-plus" @click="emit('add')">
        Добавить канал
      </UButton>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ChannelCard
        v-for="channel in filteredChannels"
        :key="channel.id"
        :channel="channel"
        @delete="emit('delete', $event)"
      />
    </div>
  </div>
</template>
