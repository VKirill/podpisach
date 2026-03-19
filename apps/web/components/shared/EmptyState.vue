<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'i-heroicons-inbox',
  description: '',
  actionLabel: '',
  actionTo: '',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <UIcon
      :name="props.icon"
      class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"
    />
    <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
      {{ props.title }}
    </h3>
    <p
      v-if="props.description"
      class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6"
    >
      {{ props.description }}
    </p>
    <UButton
      v-if="props.actionLabel && props.actionTo"
      :to="props.actionTo"
      :label="props.actionLabel"
      color="primary"
    />
  </div>
</template>
