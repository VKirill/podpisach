<script setup lang="ts">
import type { Channel } from '~/composables/useChannels'

interface Props {
  channel: Channel
}

const props = defineProps<Props>()
const emit = defineEmits<{ delete: [id: number] }>()

const statusColor = computed(() => props.channel.isActive ? 'text-green-500' : 'text-red-500')
const statusLabel = computed(() => props.channel.isActive ? '🟢 Активен' : '🔴 Не активен')
</script>

<template>
  <UCard class="flex flex-col gap-3">
    <template #header>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-semibold text-base truncate">{{ channel.title }}</h3>
          <p v-if="channel.username" class="text-sm text-gray-500 dark:text-gray-400">
            @{{ channel.username }}
          </p>
        </div>
        <PlatformBadge :platform="channel.platform" class="shrink-0" />
      </div>
    </template>

    <div class="flex items-center justify-between text-sm">
      <div class="flex gap-4">
        <span class="text-gray-600 dark:text-gray-300">
          <span class="font-medium text-gray-900 dark:text-white">{{ channel._count.subscribers }}</span>
          подписчиков
        </span>
      </div>
      <span :class="statusColor" class="text-xs font-medium">{{ statusLabel }}</span>
    </div>

    <template #footer>
      <div class="flex gap-2 flex-wrap">
        <UButton
          :to="`/channels/${channel.id}/subscribers`"
          size="sm"
          variant="outline"
          icon="i-heroicons-users"
        >
          Подписчики
        </UButton>
        <UButton
          :to="`/channels/${channel.id}/links`"
          size="sm"
          variant="outline"
          icon="i-heroicons-link"
        >
          Ссылки
        </UButton>
        <UButton
          :to="`/channels/${channel.id}`"
          size="sm"
          variant="ghost"
          icon="i-heroicons-cog-6-tooth"
        >
          Настройки
        </UButton>
      </div>
    </template>
  </UCard>
</template>
