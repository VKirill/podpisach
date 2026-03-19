<script setup lang="ts">
interface GaStatus {
  configured: boolean
  isActive?: boolean
  measurementId?: string
  lastSyncAt?: string | null
  conversionsCount?: number
}

const status = ref<GaStatus | null>(null)
const measurementId = ref('')
const apiSecret = ref('')
const saving = ref(false)
const disconnecting = ref(false)
const error = ref('')

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const d = (e as { data?: { message?: string } }).data
    if (d?.message) return d.message
  }
  return 'Ошибка запроса'
}

async function loadStatus(): Promise<void> {
  try {
    const data = await $fetch<GaStatus>('/api/integrations/ga')
    status.value = data
    if (data.configured && data.measurementId) {
      measurementId.value = data.measurementId
    }
  } catch {
    // not configured yet
  }
}

async function connect(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    await $fetch('/api/integrations/ga', {
      method: 'POST',
      body: { measurementId: measurementId.value, apiSecret: apiSecret.value },
    })
    apiSecret.value = ''
    await loadStatus()
  } catch (e) {
    error.value = extractError(e)
  } finally {
    saving.value = false
  }
}

async function disconnect(): Promise<void> {
  disconnecting.value = true
  error.value = ''
  try {
    await $fetch('/api/integrations/ga', { method: 'DELETE' })
    measurementId.value = ''
    apiSecret.value = ''
    await loadStatus()
  } catch (e) {
    error.value = extractError(e)
  } finally {
    disconnecting.value = false
  }
}

const isConnected = computed(() => status.value?.configured && status.value.isActive)

onMounted(loadStatus)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Google Analytics — Measurement Protocol v2</h2>
        <UBadge v-if="isConnected" color="success" variant="subtle">🟢 Подключено</UBadge>
        <UBadge v-else color="error" variant="subtle">🔴 Не подключено</UBadge>
      </div>
    </template>

    <!-- Connected state -->
    <div v-if="isConnected" class="space-y-4">
      <div class="space-y-1 text-sm">
        <p>
          <span class="text-gray-500 dark:text-gray-400">Measurement ID: </span>
          <span class="font-mono font-medium">{{ status?.measurementId }}</span>
        </p>
        <p v-if="status?.conversionsCount !== undefined">
          <span class="text-gray-500 dark:text-gray-400">Отправлено конверсий: </span>
          <span class="font-medium">{{ status.conversionsCount }}</span>
        </p>
        <p v-if="status?.lastSyncAt">
          <span class="text-gray-500 dark:text-gray-400">Последняя синхронизация: </span>
          <span class="font-medium">{{ new Date(status.lastSyncAt).toLocaleString('ru-RU') }}</span>
        </p>
      </div>
      <p v-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
      <UButton color="error" variant="outline" :loading="disconnecting" @click="disconnect">
        Отключить
      </UButton>
    </div>

    <!-- Disconnected state: connection form -->
    <div v-else class="space-y-4 max-w-md">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Введите Measurement ID и API Secret из GA Admin → Data Streams → Measurement Protocol.
      </p>
      <UFormField label="Measurement ID">
        <UInput
          v-model="measurementId"
          placeholder="G-XXXXXXXXXX"
          class="w-full"
        />
      </UFormField>
      <UFormField label="API Secret">
        <UInput
          v-model="apiSecret"
          type="password"
          placeholder="Введите API Secret"
          class="w-full"
        />
      </UFormField>
      <p v-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
      <UButton
        :loading="saving"
        :disabled="!measurementId.startsWith('G-') || !apiSecret"
        @click="connect"
      >
        Подключить
      </UButton>
    </div>
  </UCard>
</template>
