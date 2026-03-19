<script setup lang="ts">
import type { Platform } from '@op/shared'

interface Props {
  platform: Platform
}

const props = defineProps<Props>()

const label = computed(() => props.platform === 'telegram' ? 'Telegram' : 'MAX')
const color = computed(() => props.platform === 'telegram' ? 'blue' : 'red')
const icon = computed(() => props.platform === 'telegram' ? 'i-heroicons-paper-airplane' : 'i-heroicons-chat-bubble-left')
</script>

<template>
  <UBadge
    :label="label"
    :color="color"
    :icon="icon"
    variant="subtle"
    size="sm"
  />
</template>
