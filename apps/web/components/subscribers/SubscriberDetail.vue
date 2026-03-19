<script setup lang="ts">
import type { Platform } from '@ps/shared'

interface Props {
  subscriberId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

interface SubscriberEvent {
  id: number
  eventType: 'joined' | 'left' | 'kicked' | 'banned'
  createdAt: string
}

interface SubscriberDetailData {
  id: number
  platform: Platform
  platformUserId: string
  firstName: string | null
  lastName: string | null
  username: string | null
  attributionConfidence: number
  status: 'active' | 'left' | 'kicked' | 'banned'
  subscribedAt: string
  leftAt: string | null
  visit: {
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    utmContent: string | null
    utmTerm: string | null
    yclid: string | null
    gclid: string | null
    referrer: string | null
    pageUrl: string | null
    createdAt: string
  } | null
  inviteLink: {
    id: number
    name: string | null
    url: string
    type: string
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
  } | null
  events: SubscriberEvent[]
}

const subscriber = ref<SubscriberDetailData | null>(null)
const loading = ref(false)
const error = ref('')

const open = computed({
  get: () => props.subscriberId !== null,
  set: (v: boolean) => { if (!v) emit('close') },
})

watch(
  () => props.subscriberId,
  async (id) => {
    if (!id) { subscriber.value = null; return }
    loading.value = true
    error.value = ''
    try {
      subscriber.value = await $fetch<SubscriberDetailData>(`/api/subscribers/${id}`)
    } catch {
      error.value = 'Не удалось загрузить данные подписчика'
    } finally {
      loading.value = false
    }
  },
)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

const eventLabels: Record<string, string> = {
  joined: '✅ Подписался',
  left: '👋 Отписался',
  kicked: '🚫 Исключён',
  banned: '⛔ Заблокирован',
}

function displayName(sub: SubscriberDetailData): string {
  const parts = [sub.firstName, sub.lastName].filter(Boolean)
  return parts.length ? parts.join(' ') : `ID: ${sub.platformUserId}`
}
</script>

<template>
  <USlideover v-model:open="open" :title="subscriber ? displayName(subscriber) : 'Подписчик'">
    <template #body>
      <div class="p-4 space-y-5">
        <!-- Loader -->
        <div v-if="loading" class="flex justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
        </div>

        <div v-else-if="error" class="text-sm text-red-600">{{ error }}</div>

        <template v-else-if="subscriber">
          <!-- Основная информация -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold">{{ displayName(subscriber) }}</span>
              <PlatformBadge :platform="subscriber.platform" />
            </div>
            <p v-if="subscriber.username" class="text-sm text-gray-500">
              @{{ subscriber.username }}
            </p>
            <p class="text-xs text-gray-400">Platform ID: {{ subscriber.platformUserId }}</p>
          </div>

          <USeparator />

          <!-- Статус и даты -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Статус</span>
              <UBadge
                :label="subscriber.status"
                :color="subscriber.status === 'active' ? 'success' : 'error'"
                variant="subtle"
                size="sm"
              />
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Подписался</span>
              <span>{{ formatDate(subscriber.subscribedAt) }}</span>
            </div>
            <div v-if="subscriber.leftAt" class="flex justify-between">
              <span class="text-gray-500">Отписался</span>
              <span>{{ formatDate(subscriber.leftAt) }}</span>
            </div>
          </div>

          <USeparator />

          <!-- Атрибуция -->
          <div class="space-y-2">
            <h3 class="text-sm font-semibold">Атрибуция</h3>
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Точность</span>
              <ConfidenceBadge :confidence="subscriber.attributionConfidence" />
            </div>
            <div v-if="subscriber.inviteLink" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">Метод</span>
              <span>{{ subscriber.inviteLink.type === 'auto' ? 'Invite-ссылка (авто)' : 'Ручная ссылка' }}</span>
            </div>
          </div>

          <!-- UTM-метки -->
          <template v-if="subscriber.visit">
            <USeparator />
            <div class="space-y-2">
              <h3 class="text-sm font-semibold">UTM-метки</h3>
              <dl class="space-y-1 text-sm">
                <div v-if="subscriber.visit.utmSource" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">utm_source</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.utmSource }}
                  </dd>
                </div>
                <div v-if="subscriber.visit.utmMedium" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">utm_medium</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.utmMedium }}
                  </dd>
                </div>
                <div v-if="subscriber.visit.utmCampaign" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">utm_campaign</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.utmCampaign }}
                  </dd>
                </div>
                <div v-if="subscriber.visit.utmContent" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">utm_content</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.utmContent }}
                  </dd>
                </div>
                <div v-if="subscriber.visit.utmTerm" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">utm_term</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.utmTerm }}
                  </dd>
                </div>
                <div v-if="subscriber.visit.yclid" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">yclid</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.yclid }}
                  </dd>
                </div>
                <div v-if="subscriber.visit.gclid" class="flex justify-between gap-2">
                  <dt class="text-gray-500 shrink-0">gclid</dt>
                  <dd class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded truncate">
                    {{ subscriber.visit.gclid }}
                  </dd>
                </div>
              </dl>
            </div>
          </template>

          <!-- История событий -->
          <template v-if="subscriber.events.length">
            <USeparator />
            <div class="space-y-2">
              <h3 class="text-sm font-semibold">История событий</h3>
              <ul class="space-y-1.5">
                <li
                  v-for="ev in subscriber.events"
                  :key="ev.id"
                  class="flex items-center justify-between text-sm"
                >
                  <span>{{ eventLabels[ev.eventType] ?? ev.eventType }}</span>
                  <span class="text-xs text-gray-400">{{ formatDate(ev.createdAt) }}</span>
                </li>
              </ul>
            </div>
          </template>
        </template>
      </div>
    </template>
  </USlideover>
</template>
