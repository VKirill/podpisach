<script setup lang="ts">
interface Props {
  title: string
  value: number | string | null
  icon: string
  change?: number
  trend?: 'up' | 'down'
}

const props = withDefaults(defineProps<Props>(), {
  change: undefined,
  trend: undefined,
})

const displayValue = computed<string>(() => {
  if (props.value === null || props.value === undefined) return '—'
  return typeof props.value === 'number' ? formatNumber(props.value) : String(props.value)
})

// 'down' trend означает что рост — это плохо (например, отписки)
const changeColor = computed<string>(() => {
  if (props.change === undefined || props.change === null) return ''
  const isPositive = props.change >= 0
  if (props.trend === 'down') {
    return isPositive ? 'text-red-500' : 'text-green-600 dark:text-green-400'
  }
  return isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500'
})
</script>

<template>
  <UCard>
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ title }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ displayValue }}</p>
        <p v-if="change !== undefined" class="text-sm mt-1 font-medium" :class="changeColor">
          {{ change >= 0 ? '+' : '' }}{{ change }} сегодня
        </p>
      </div>
      <UIcon :name="icon" class="w-8 h-8 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
    </div>
  </UCard>
</template>
