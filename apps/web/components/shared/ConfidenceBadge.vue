<script setup lang="ts">
interface Props {
  confidence: number
}

const props = defineProps<Props>()

const color = computed(() => {
  if (props.confidence >= 0.9) return 'green'
  if (props.confidence >= 0.7) return 'yellow'
  return 'red'
})

const label = computed(() => {
  return `${Math.round(props.confidence * 100)}%`
})

const tooltip = computed(() => {
  if (props.confidence >= 0.9) return 'Высокая точность'
  if (props.confidence >= 0.7) return 'Средняя точность'
  return 'Низкая точность'
})
</script>

<template>
  <UBadge
    :label="label"
    :color="color"
    :title="tooltip"
    variant="subtle"
    size="sm"
  />
</template>
