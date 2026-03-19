<script setup lang="ts">
import type { ReportData } from '~/composables/useReport'

interface Props {
  data: ReportData
}

const props = defineProps<Props>()

// Максимальное значение для нормализации графика
const maxChartValue = computed<number>(() => {
  const allValues = [...props.data.chart.joins, ...props.data.chart.leaves]
  return Math.max(...allValues, 1)
})

// Высота бара в процентах от максимума
function barHeight(value: number): string {
  return `${Math.round((value / maxChartValue.value) * 100)}%`
}

// Подпись источника
function sourceLabel(source: string | null, medium: string | null): string {
  if (!source && !medium) return 'Прямой переход'
  const parts = [source, medium].filter(Boolean)
  return parts.join(' / ')
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-8">
    <!-- Заголовок -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ data.report.name }}</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">{{ data.report.channelTitle }}</p>
    </div>

    <!-- Карточки статистики -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Всего подписчиков</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ formatNumber(data.stats.totalSubscribers) }}
            </p>
          </div>
          <UIcon name="i-heroicons-users" class="w-8 h-8 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Новых за неделю</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">
              +{{ formatNumber(data.stats.newThisWeek) }}
            </p>
          </div>
          <UIcon name="i-heroicons-arrow-trending-up" class="w-8 h-8 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Ушли за неделю</p>
            <p class="text-2xl font-bold text-red-500">
              -{{ formatNumber(data.stats.leftThisWeek) }}
            </p>
          </div>
          <UIcon name="i-heroicons-arrow-trending-down" class="w-8 h-8 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
        </div>
      </UCard>
    </div>

    <!-- График подписок за 30 дней -->
    <UCard>
      <template #header>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Подписки за 30 дней</h2>
      </template>

      <div class="flex items-end gap-0.5 h-40 w-full">
        <template v-for="(joins, i) in data.chart.joins" :key="i">
          <div class="flex-1 flex flex-col items-center gap-0.5 h-full justify-end group relative">
            <!-- Tooltip -->
            <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {{ data.chart.labels[i] }}<br>
              +{{ joins }} / -{{ data.chart.leaves[i] }}
            </div>
            <!-- Уходы (красные, снизу) -->
            <div
              class="w-full bg-red-300 dark:bg-red-800 rounded-t transition-all"
              :style="{ height: barHeight(data.chart.leaves[i] ?? 0) }"
            />
            <!-- Подписки (зелёные, выше) -->
            <div
              class="w-full bg-primary-500 rounded-t transition-all"
              :style="{ height: barHeight(joins) }"
            />
          </div>
        </template>
      </div>

      <div class="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
        <span>{{ data.chart.labels[0] }}</span>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-sm bg-primary-500" /> Подписки</span>
          <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-sm bg-red-300 dark:bg-red-800" /> Отписки</span>
        </div>
        <span>{{ data.chart.labels[data.chart.labels.length - 1] }}</span>
      </div>
    </UCard>

    <!-- Источники трафика -->
    <UCard v-if="data.sources.length > 0">
      <template #header>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Источники трафика</h2>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Источник</th>
              <th class="text-right py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Подписчиков</th>
              <th class="text-right py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Конверсия</th>
              <template v-if="data.sources.some(s => s.totalCost !== undefined)">
                <th class="text-right py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Затраты</th>
                <th class="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Цена подписчика</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(src, i) in data.sources"
              :key="i"
              class="border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <td class="py-2.5 pr-4 text-gray-900 dark:text-white font-medium">
                {{ sourceLabel(src.source, src.medium) }}
              </td>
              <td class="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-300">
                {{ formatNumber(src.subscribers) }}
              </td>
              <td class="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-300">
                {{ src.conversionPct.toFixed(1) }}%
              </td>
              <template v-if="data.sources.some(s => s.totalCost !== undefined)">
                <td class="py-2.5 pr-4 text-right text-gray-700 dark:text-gray-300">
                  <span v-if="src.totalCost !== undefined">
                    {{ formatCurrency(src.totalCost, src.costCurrency ?? 'RUB') }}
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="py-2.5 text-right text-gray-700 dark:text-gray-300">
                  <span v-if="src.costPerSubscriber !== undefined">
                    {{ formatCurrency(src.costPerSubscriber, src.costCurrency ?? 'RUB') }}
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Подписчики (только если showSubscriberNames = true) -->
    <UCard v-if="data.subscribers && data.subscribers.length > 0">
      <template #header>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Подписчики</h2>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Имя</th>
              <th class="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Дата подписки</th>
              <th class="text-left py-2 pr-4 font-medium text-gray-500 dark:text-gray-400">Источник</th>
              <th class="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Уверенность</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(sub, i) in data.subscribers"
              :key="i"
              class="border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <td class="py-2.5 pr-4 text-gray-900 dark:text-white">
                {{ sub.name ?? '—' }}
              </td>
              <td class="py-2.5 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {{ formatDateShort(sub.subscribedAt) }}
              </td>
              <td class="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                {{ sub.source ?? '—' }}
              </td>
              <td class="py-2.5">
                <ConfidenceBadge :confidence="sub.confidence" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Футер -->
    <div class="text-center pt-4 pb-8">
      <p class="text-sm text-gray-400 dark:text-gray-500">
        Отчёт создан через
        <span class="font-medium text-gray-500 dark:text-gray-400">«ПодписачЪ»</span>
        — open-source система атрибуции подписчиков Telegram-каналов
      </p>
    </div>
  </div>
</template>
