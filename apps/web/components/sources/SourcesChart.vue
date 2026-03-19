<script setup lang="ts">
import type { SourceRow } from '~/composables/useSources'

interface Props {
  sources: SourceRow[]
}

interface ChartItem {
  label: string
  subscribers: number
  conversionPct: number
}

type Metric = 'subscribers' | 'conversion'

const props = defineProps<Props>()

const metric = ref<Metric>('subscribers')

const chartData = computed<ChartItem[]>(() => {
  const map = new Map<string, { subscribers: number; visits: number }>()

  for (const row of props.sources) {
    const key = row.source ?? '(direct)'
    const existing = map.get(key) ?? { subscribers: 0, visits: 0 }
    existing.subscribers += row.subscribers
    existing.visits += row.visits
    map.set(key, existing)
  }

  return Array.from(map.entries())
    .map(([key, data]) => ({
      label: key === '(direct)' ? 'Прямой трафик' : key,
      subscribers: data.subscribers,
      conversionPct:
        data.visits > 0
          ? parseFloat(((data.subscribers / data.visits) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, 10)
})

const maxValue = computed<number>(() => {
  if (!chartData.value.length) return 1
  return Math.max(
    ...chartData.value.map((item) =>
      metric.value === 'subscribers' ? item.subscribers : item.conversionPct,
    ),
  )
})

function barWidth(item: ChartItem): string {
  const value = metric.value === 'subscribers' ? item.subscribers : item.conversionPct
  const pct = maxValue.value > 0 ? Math.round((value / maxValue.value) * 100) : 0
  return `${pct}%`
}

function displayValue(item: ChartItem): string {
  if (metric.value === 'subscribers') return formatNumber(item.subscribers)
  return `${item.conversionPct}%`
}

const metricItems = [
  { label: 'Подписчики', value: 'subscribers' },
  { label: 'Конверсия', value: 'conversion' },
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Сравнение источников</h3>
      <USelect
        v-model="metric"
        :items="metricItems"
        value-key="value"
        label-key="label"
        size="sm"
        class="w-36"
      />
    </div>

    <div v-if="chartData.length" class="space-y-3">
      <div v-for="item in chartData" :key="item.label">
        <div class="flex justify-between items-center text-sm mb-1.5">
          <span class="text-gray-700 dark:text-gray-300 truncate mr-2 max-w-52">
            {{ item.label }}
          </span>
          <span class="font-semibold flex-shrink-0 text-gray-900 dark:text-white">
            {{ displayValue(item) }}
          </span>
        </div>
        <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
          <div
            class="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
            :style="{ width: barWidth(item) }"
          />
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="i-heroicons-chart-bar"
      title="Нет данных"
      description="Нет данных об источниках за выбранный период"
    />
  </div>
</template>
