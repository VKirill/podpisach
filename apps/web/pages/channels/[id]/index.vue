<script setup lang="ts">
import type { Channel } from '~/composables/useChannels'

definePageMeta({ middleware: 'auth' })

interface ChannelStats {
  totalSubscribers: number
  newSubscribers: number
  unsubscribed: number
  topSources: Array<{ utmSource: string | null; count: number }>
  period: { from: string; to: string }
}

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { data: channelData, refresh: refreshChannel } = await useFetch<{ channel: Channel }>(
  `/api/channels/${id}`,
)
const { data: statsData } = await useFetch<ChannelStats>(`/api/channels/${id}/stats`)

const channel = computed(() => channelData.value?.channel)
const stats = computed(() => statsData.value)

const conversionRate = computed(() => {
  const s = stats.value
  if (!s) return '—'
  const total = s.newSubscribers + s.unsubscribed
  return total ? `${Math.round((s.newSubscribers / total) * 100)}%` : '100%'
})

// Settings
const linkTtlHours = ref(channel.value?.linkTtlHours ?? 24)
const isActive = ref(channel.value?.isActive ?? true)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function saveSettings(): Promise<void> {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch(`/api/channels/${id}`, {
      method: 'PATCH',
      body: { linkTtlHours: linkTtlHours.value, isActive: isActive.value },
    })
    saveSuccess.value = true
    await refreshChannel()
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    saveError.value = e?.data?.message ?? e?.message ?? 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

// Deactivate
const showConfirm = ref(false)
const deactivating = ref(false)

async function deactivateChannel(): Promise<void> {
  deactivating.value = true
  try {
    await $fetch(`/api/channels/${id}`, { method: 'DELETE' })
    await navigateTo('/channels')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    saveError.value = e?.data?.message ?? e?.message ?? 'Не удалось деактивировать канал'
    showConfirm.value = false
  } finally {
    deactivating.value = false
  }
}

// Tabs
const tabPaths = [
  `/channels/${id}`,
  `/channels/${id}/subscribers`,
  `/channels/${id}/links`,
  `/channels/${id}/report`,
]
const tabItems = [
  { label: 'Обзор', slot: 'overview' },
  { label: 'Подписчики', slot: 'subscribers' },
  { label: 'Ссылки', slot: 'links' },
  { label: 'Отчёт', slot: 'report' },
]

function handleTabChange(index: number): void {
  const path = tabPaths[index]
  if (path) router.push(path)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Заголовок -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-3 min-w-0">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" size="sm" to="/channels" />
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold truncate">
              {{ channel?.title ?? `Канал #${id}` }}
            </h1>
            <PlatformBadge v-if="channel" :platform="channel.platform" />
          </div>
          <p v-if="channel?.username" class="text-sm text-gray-500 dark:text-gray-400">
            @{{ channel.username }}
          </p>
        </div>
      </div>
      <UBadge v-if="channel" :color="channel.isActive ? 'success' : 'error'" variant="subtle">
        {{ channel.isActive ? '🟢 Активен' : '🔴 Неактивен' }}
      </UBadge>
    </div>

    <!-- Навигация -->
    <UTabs :items="tabItems" :default-index="0" @change="handleTabChange" />

    <!-- Метрики -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Всего подписчиков</div>
        <div class="text-2xl font-bold">{{ stats?.totalSubscribers ?? '—' }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Новых за 7 дней</div>
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
          +{{ stats?.newSubscribers ?? '—' }}
        </div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Отписок за 7 дней</div>
        <div class="text-2xl font-bold text-red-500">-{{ stats?.unsubscribed ?? '—' }}</div>
      </UCard>
      <UCard>
        <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Конверсия</div>
        <div class="text-2xl font-bold">{{ conversionRate }}</div>
      </UCard>
    </div>

    <!-- Топ источников -->
    <UCard v-if="stats?.topSources?.length">
      <template #header>
        <h2 class="font-semibold">Топ источников</h2>
      </template>
      <ul class="space-y-2">
        <li
          v-for="src in stats.topSources.slice(0, 5)"
          :key="src.utmSource ?? 'unknown'"
          class="flex justify-between text-sm"
        >
          <span class="text-gray-700 dark:text-gray-300">
            {{ src.utmSource ?? 'Прямой переход' }}
          </span>
          <span class="font-medium">{{ src.count }}</span>
        </li>
      </ul>
    </UCard>

    <!-- Настройки -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Настройки канала</h2>
          <div class="flex gap-2">
            <UButton :to="`/channels/${id}/subscribers`" variant="ghost" size="sm">
              Подписчики ({{ channel?._count?.subscribers ?? 0 }})
            </UButton>
            <UButton :to="`/channels/${id}/links`" variant="ghost" size="sm">
              Ссылки ({{ channel?._count?.inviteLinks ?? 0 }})
            </UButton>
          </div>
        </div>
      </template>

      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium mb-2">TTL invite-ссылок (часов)</label>
          <div class="flex items-center gap-4">
            <input
              v-model.number="linkTtlHours"
              type="range" min="1" max="168" step="1"
              class="flex-1 accent-primary-500"
            />
            <UInput v-model.number="linkTtlHours" type="number" :min="1" :max="168" class="w-24" />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Ссылки удаляются через {{ linkTtlHours }} ч. после создания
          </p>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Канал активен</div>
            <div class="text-xs text-gray-500">Выключите, чтобы прекратить отслеживание</div>
          </div>
          <UToggle v-model="isActive" />
        </div>

        <div v-if="saveError" class="text-sm text-red-600 dark:text-red-400">{{ saveError }}</div>
        <div v-if="saveSuccess" class="text-sm text-green-600 dark:text-green-400">✅ Настройки сохранены</div>

        <div class="flex items-center justify-between">
          <UButton :loading="saving" @click="saveSettings">Сохранить настройки</UButton>
          <UButton color="error" variant="outline" @click="showConfirm = true">
            Деактивировать канал
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Confirm modal -->
    <UModal v-model:open="showConfirm" title="Деактивировать канал?">
      <template #body>
        <p class="text-sm">
          Канал <strong>{{ channel?.title }}</strong> будет деактивирован.
          Данные подписчиков и ссылок сохранятся. Действие можно отменить в настройках.
        </p>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="ghost" @click="showConfirm = false">Отмена</UButton>
          <UButton color="error" :loading="deactivating" @click="deactivateChannel">
            Деактивировать
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
