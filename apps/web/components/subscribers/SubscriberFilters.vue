<script setup lang="ts">
interface Props {
  sources: string[]
  status: string
  search: string
  source: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:status': [value: string]
  'update:search': [value: string]
  'update:source': [value: string]
}>()

const statusModel = computed({
  get: () => props.status,
  set: (v) => emit('update:status', v),
})

const searchModel = computed({
  get: () => props.search,
  set: (v) => emit('update:search', v),
})

const sourceModel = computed({
  get: () => props.source,
  set: (v) => emit('update:source', v),
})

const statusItems = [
  { label: 'Все', value: 'all' },
  { label: 'Активные', value: 'active' },
  { label: 'Ушедшие', value: 'left' },
  { label: 'Исключённые', value: 'kicked' },
  { label: 'Заблокированные', value: 'banned' },
]

const sourceItems = computed(() => [
  { label: 'Все источники', value: '' },
  ...props.sources.map((s) => ({ label: s, value: s })),
])
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <UInput
      v-model="searchModel"
      class="w-64"
      icon="i-heroicons-magnifying-glass"
      placeholder="Имя или @username"
    />
    <USelect
      v-model="statusModel"
      :items="statusItems"
      value-key="value"
      label-key="label"
      class="w-44"
    />
    <USelect
      v-model="sourceModel"
      :items="sourceItems"
      value-key="value"
      label-key="label"
      class="w-48"
    />
  </div>
</template>
