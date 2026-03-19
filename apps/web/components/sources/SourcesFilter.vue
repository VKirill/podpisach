<script setup lang="ts">
import type { Channel } from '~/composables/useChannels'

interface Props {
  period: string
  channelId: number | null
  channels: Channel[]
  onlyWithCosts: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:period': [value: string]
  'update:channelId': [value: number | null]
  'update:onlyWithCosts': [value: boolean]
}>()

const periodModel = computed({
  get: () => props.period,
  set: (v) => emit('update:period', v),
})

const channelModel = computed({
  get: () => props.channelId,
  set: (v: number | null) => emit('update:channelId', v),
})

const costsModel = computed({
  get: () => props.onlyWithCosts,
  set: (v) => emit('update:onlyWithCosts', v),
})

const periodItems = [
  { label: '7 дней', value: '7d' },
  { label: '30 дней', value: '30d' },
  { label: '90 дней', value: '90d' },
  { label: 'Всё время', value: 'all' },
]

const channelItems = computed(() => [
  { label: 'Все каналы', value: null as number | null },
  ...props.channels.map((c) => ({ label: c.title, value: c.id as number | null })),
])
</script>

<template>
  <div class="flex flex-wrap gap-3 items-center">
    <USelect
      v-model="channelModel"
      :items="channelItems"
      value-key="value"
      label-key="label"
      class="w-48"
    />
    <USelect
      v-model="periodModel"
      :items="periodItems"
      value-key="value"
      label-key="label"
      class="w-40"
    />
    <div class="flex items-center gap-2">
      <UToggle v-model="costsModel" />
      <span class="text-sm text-gray-600 dark:text-gray-400">Только с затратами</span>
    </div>
  </div>
</template>
