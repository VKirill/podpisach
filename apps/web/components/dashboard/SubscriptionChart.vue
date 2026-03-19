<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

type Period = '7d' | '30d' | '90d'

interface ChartApiData {
  labels: string[]
  joins: number[]
  leaves: number[]
}

const periods: Array<{ label: string; value: Period }> = [
  { label: '7 дней', value: '7d' },
  { label: '30 дней', value: '30d' },
  { label: '90 дней', value: '90d' },
]

const period = ref<Period>('7d')

const { data, status } = useFetch<ChartApiData>('/api/stats/chart', {
  query: { period },
})

const hasData = computed<boolean>(() => {
  if (!data.value) return false
  return data.value.joins.some(v => v > 0) || data.value.leaves.some(v => v > 0)
})

const chartData = computed(() => ({
  labels: data.value?.labels ?? [],
  datasets: [
    {
      label: 'Подписки',
      data: data.value?.joins ?? [],
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.4,
      fill: true,
    },
    {
      label: 'Отписки',
      data: data.value?.leaves ?? [],
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4,
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const },
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <h2 class="font-semibold">График подписок</h2>
        <div class="flex gap-1">
          <UButton
            v-for="p in periods"
            :key="p.value"
            size="xs"
            :variant="period === p.value ? 'solid' : 'ghost'"
            @click="period = p.value"
          >
            {{ p.label }}
          </UButton>
        </div>
      </div>
    </template>

    <div v-if="status === 'pending'" class="h-64 flex items-center justify-center">
      <USkeleton class="h-full w-full rounded-lg" />
    </div>

    <div v-else-if="hasData" class="h-64">
      <ClientOnly>
        <Line :data="chartData" :options="chartOptions" />
        <template #fallback>
          <USkeleton class="h-full w-full rounded-lg" />
        </template>
      </ClientOnly>
    </div>

    <EmptyState
      v-else
      icon="i-heroicons-chart-bar"
      title="Пока нет данных"
      description="Данные появятся после первых подписок на ваши каналы"
    />
  </UCard>
</template>
