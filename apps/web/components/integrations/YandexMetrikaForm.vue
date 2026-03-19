<script setup lang="ts">
import { GOAL_DEFAULT_NAMES } from '@ps/shared/constants'

interface YmStatus {
  configured: boolean
  isConnected: boolean
  yaLogin: string | null
  clientId: string | null
  countersCount: number
}

interface YmCounter {
  id: number
  yandexCounterId: string
  counterName: string
  counterSite: string | null
}

interface ChannelGoal {
  id: number
  goalKey: string
  customName: string | null
  isEnabled: boolean
  yandexGoalId: string | null
}

const status = ref<YmStatus | null>(null)
const clientId = ref('')
const clientSecret = ref('')
const credsSaving = ref(false)
const credsError = ref('')
const counters = ref<YmCounter[]>([])
const countersLoading = ref(false)
const channelGoalsMap = ref<Record<number, ChannelGoal[]>>({})
const channelGoalsLoading = ref<Record<number, boolean>>({})
const { channels, fetchChannels } = useChannels()

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const d = (e as { data?: { message?: string } }).data
    if (d?.message) return d.message
  }
  return 'Ошибка запроса'
}

async function loadStatus(): Promise<void> {
  try {
    const data = await $fetch<YmStatus>('/api/integrations/ym/status')
    status.value = data
    if (data.clientId) clientId.value = data.clientId
  } catch {
    // ignore — not configured yet
  }
}

async function saveCredentials(): Promise<void> {
  credsSaving.value = true
  credsError.value = ''
  try {
    await $fetch('/api/integrations/ym/credentials', {
      method: 'POST',
      body: { clientId: clientId.value, clientSecret: clientSecret.value },
    })
    await loadStatus()
    clientSecret.value = ''
  } catch (e) {
    credsError.value = extractError(e)
  } finally {
    credsSaving.value = false
  }
}

function goToAuth(): void {
  window.location.href = '/api/integrations/ym/auth'
}

async function loadCounters(): Promise<void> {
  countersLoading.value = true
  try {
    const data = await $fetch<{ counters: YmCounter[] }>('/api/integrations/ym/counters')
    counters.value = data.counters
  } finally {
    countersLoading.value = false
  }
}

async function loadChannelGoals(channelId: number): Promise<void> {
  channelGoalsLoading.value[channelId] = true
  try {
    const data = await $fetch<{ counter: object; goals: ChannelGoal[] }>(
      `/api/channels/${channelId}/goals`,
    )
    channelGoalsMap.value[channelId] = data.goals
  } catch {
    // no counter bound yet
  } finally {
    channelGoalsLoading.value[channelId] = false
  }
}

async function bindCounter(channelId: number, counterId: number): Promise<void> {
  channelGoalsLoading.value[channelId] = true
  try {
    const data = await $fetch<{ goals: ChannelGoal[] }>(
      `/api/channels/${channelId}/counter`,
      { method: 'POST', body: { counterId } },
    )
    channelGoalsMap.value[channelId] = data.goals
  } finally {
    channelGoalsLoading.value[channelId] = false
  }
}

async function patchGoal(
  channelId: number,
  goal: ChannelGoal,
  patch: { customName?: string; isEnabled: boolean },
): Promise<void> {
  goal.isEnabled = patch.isEnabled
  if (patch.customName !== undefined) goal.customName = patch.customName
  await $fetch(`/api/channels/${channelId}/goals/${goal.id}`, {
    method: 'PATCH',
    body: patch,
  })
}

const counterSelectItems = computed(() =>
  counters.value.map(c => ({ label: `${c.counterName} (${c.yandexCounterId})`, value: c.id })),
)
const counterColumns = [
  { id: 'counterId', header: 'ID' },
  { id: 'name', header: 'Название' },
  { id: 'site', header: 'Сайт' },
]
const goalColumns = [
  { id: 'key', header: 'Ключ цели' },
  { id: 'customName', header: 'Название в Метрике' },
  { id: 'enabled', header: 'Активна' },
]
onMounted(async () => {
  await Promise.all([loadStatus(), fetchChannels()])
  if (status.value?.isConnected) {
    await loadCounters()
    await Promise.all(channels.value.map(ch => loadChannelGoals(ch.id)))
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- 1. OAuth Keys -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Яндекс Метрика — OAuth-ключи</h2>
      </template>
      <div class="space-y-4 max-w-md">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Создайте OAuth-приложение на
          <a href="https://oauth.yandex.ru" target="_blank" class="underline text-primary-500">
            oauth.yandex.ru
          </a>
          и вставьте ключи ниже.
        </p>
        <UFormField label="Client ID">
          <UInput v-model="clientId" placeholder="Например: a1b2c3d4e5f6" class="w-full" />
        </UFormField>
        <UFormField label="Client Secret">
          <UInput
            v-model="clientSecret"
            type="password"
            placeholder="Введите для обновления"
            class="w-full"
          />
        </UFormField>
        <p v-if="credsError" class="text-sm text-red-500 dark:text-red-400">{{ credsError }}</p>
        <UButton :loading="credsSaving" :disabled="!clientId || !clientSecret" @click="saveCredentials">
          Сохранить
        </UButton>
      </div>
    </UCard>

    <!-- 2. Auth Status -->
    <UCard v-if="status?.configured">
      <template #header>
        <h2 class="font-semibold">Авторизация</h2>
      </template>
      <div v-if="status.isConnected" class="flex items-center gap-3">
        <UBadge color="success" variant="subtle">✅ Подключено</UBadge>
        <span v-if="status.yaLogin" class="text-sm text-gray-600 dark:text-gray-400">
          {{ status.yaLogin }}
        </span>
      </div>
      <div v-else class="space-y-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Авторизуйтесь через Яндекс, чтобы получить доступ к счётчикам.
        </p>
        <UButton icon="i-heroicons-arrow-right-circle" @click="goToAuth">
          Авторизоваться в Яндекс
        </UButton>
      </div>
    </UCard>

    <!-- 3. Counters -->
    <UCard v-if="status?.isConnected">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Счётчики</h2>
          <UButton size="sm" variant="outline" :loading="countersLoading" @click="loadCounters">
            Загрузить счётчики
          </UButton>
        </div>
      </template>
      <UTable v-if="counters.length > 0" :data="counters" :columns="counterColumns">
        <template #counterId-cell="{ row }">
          <span class="font-mono text-sm">{{ row.original.yandexCounterId }}</span>
        </template>
        <template #name-cell="{ row }">
          <span class="text-sm">{{ row.original.counterName }}</span>
        </template>
        <template #site-cell="{ row }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ row.original.counterSite ?? '—' }}
          </span>
        </template>
      </UTable>
      <p v-else-if="!countersLoading" class="text-sm text-gray-500 dark:text-gray-400">
        Нажмите «Загрузить счётчики» для получения списка.
      </p>
    </UCard>

    <!-- 4. Channel Goals -->
    <UCard v-if="status?.isConnected && channels.length > 0">
      <template #header>
        <h2 class="font-semibold">Счётчики и цели по каналам</h2>
      </template>
      <div class="space-y-6">
        <div
          v-for="channel in channels"
          :key="channel.id"
          class="border-b border-gray-100 dark:border-gray-800 pb-5 last:border-0 last:pb-0"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium">{{ channel.title }}</h3>
            <USelect
              v-if="counterSelectItems.length > 0"
              :items="counterSelectItems"
              placeholder="Привязать счётчик..."
              size="sm"
              class="w-64"
              @update:model-value="(v: unknown) => bindCounter(channel.id, v as number)"
            />
          </div>
          <div v-if="channelGoalsMap[channel.id]?.length">
            <UTable
              :data="channelGoalsMap[channel.id]"
              :columns="goalColumns"
              :loading="channelGoalsLoading[channel.id]"
            >
              <template #key-cell="{ row }">
                <span class="font-mono text-xs text-gray-600 dark:text-gray-400">
                  {{ row.original.goalKey }}
                </span>
              </template>
              <template #customName-cell="{ row }">
                <UInput
                  :model-value="row.original.customName ?? GOAL_DEFAULT_NAMES[row.original.goalKey]"
                  size="sm"
                  class="w-52"
                  @change="(e: Event) => patchGoal(channel.id, row.original, {
                    customName: (e.target as HTMLInputElement).value,
                    isEnabled: row.original.isEnabled,
                  })"
                />
              </template>
              <template #enabled-cell="{ row }">
                <UToggle
                  :model-value="row.original.isEnabled"
                  @update:model-value="(v: boolean) => patchGoal(channel.id, row.original, {
                    customName: row.original.customName ?? undefined,
                    isEnabled: v,
                  })"
                />
              </template>
            </UTable>
          </div>
          <p v-else-if="channelGoalsLoading[channel.id]" class="text-sm text-gray-500">
            Загрузка целей...
          </p>
          <p v-else class="text-sm text-gray-400 dark:text-gray-500">
            Выберите счётчик для автоматического создания целей.
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>
