<script setup lang="ts">
interface Source {
  source: string
  medium: string
  count: number
}

interface Props {
  sources?: Source[]
}

const props = withDefaults(defineProps<Props>(), {
  sources: () => [],
})

const maxCount = computed<number>(() => {
  if (!props.sources?.length) return 1
  return Math.max(...props.sources.map(s => s.count))
})

function barWidth(count: number): string {
  return `${Math.round((count / maxCount.value) * 100)}%`
}

function sourceLabel(s: Source): string {
  const src = s.source || '(direct)'
  if (!s.source || s.source === '(direct)') return 'Прямой переход'
  if (s.medium) return `${src} / ${s.medium}`
  return src
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">Топ источники</h2>
    </template>

    <div v-if="sources?.length" class="space-y-4">
      <div
        v-for="(src, index) in sources"
        :key="`${src.source}-${src.medium}-${index}`"
      >
        <div class="flex justify-between items-center text-sm mb-1.5">
          <span class="text-gray-700 dark:text-gray-300 truncate mr-2">
            {{ sourceLabel(src) }}
          </span>
          <span class="font-semibold flex-shrink-0 text-gray-900 dark:text-white">
            {{ formatNumber(src.count) }}
          </span>
        </div>
        <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
          <div
            class="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
            :style="{ width: barWidth(src.count) }"
          />
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="i-heroicons-globe-alt"
      title="Нет данных"
      description="Установите JS-скрипт на ваш сайт для отслеживания источников"
      action-label="Получить скрипт"
      action-to="/script"
    />
  </UCard>
</template>
