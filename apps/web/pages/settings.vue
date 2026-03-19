<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const {
  settings,
  bots,
  systemInfo,
  loading,
  error,
  loadSettings,
  saveSettings,
  changePassword,
  loadBots,
  deactivateBot,
  loadSystemInfo,
} = useSettings()

// Password form state
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordSuccess = ref(false)
const passwordError = ref('')
const passwordLoading = ref(false)

// Local model for correlation window (avoid saving on every keystroke)
const correlationWindowInput = ref(60)

// Timezone items
const timezoneItems = [
  'UTC',
  'Europe/Moscow',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Almaty',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Vladivostok',
  'Asia/Kamchatka',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
].map((tz) => ({ label: tz, value: tz }))

// Sync correlation window from settings after load
watch(
  () => settings.value.maxCorrelationWindowSec,
  (val) => {
    correlationWindowInput.value = val
  },
  { immediate: true },
)

async function onTimezoneChange(tz: string) {
  await saveSettings({ timezone: tz })
}

async function onCorrelationSave() {
  const val = Number(correlationWindowInput.value)
  if (val >= 10 && val <= 300) {
    await saveSettings({ maxCorrelationWindowSec: val })
  }
}

async function handlePasswordChange() {
  passwordError.value = ''
  passwordSuccess.value = false
  if (newPassword.value.length < 8) {
    passwordError.value = 'Новый пароль должен содержать минимум 8 символов'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Пароли не совпадают'
    return
  }
  passwordLoading.value = true
  const ok = await changePassword(currentPassword.value, newPassword.value)
  passwordLoading.value = false
  if (ok) {
    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } else {
    passwordError.value = error.value
  }
}

function formatDbSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

function exportAll() {
  window.open('/api/stats/export')
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadBots(), loadSystemInfo()])
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Настройки</h1>

    <!-- Смена пароля -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Смена пароля</h2>
      </template>
      <form class="space-y-4 max-w-sm" @submit.prevent="handlePasswordChange">
        <UFormField label="Текущий пароль" :error="passwordError">
          <UInput
            v-model="currentPassword"
            type="password"
            class="w-full"
            autocomplete="current-password"
          />
        </UFormField>
        <UFormField label="Новый пароль">
          <UInput
            v-model="newPassword"
            type="password"
            placeholder="Минимум 8 символов"
            class="w-full"
            autocomplete="new-password"
          />
        </UFormField>
        <UFormField label="Подтвердите новый пароль">
          <UInput
            v-model="confirmPassword"
            type="password"
            class="w-full"
            autocomplete="new-password"
          />
        </UFormField>
        <p v-if="passwordSuccess" class="text-sm text-green-600 dark:text-green-400">
          Пароль успешно изменён
        </p>
        <UButton
          type="submit"
          :loading="passwordLoading"
          :disabled="!currentPassword || !newPassword || !confirmPassword"
        >
          Сменить пароль
        </UButton>
      </form>
    </UCard>

    <!-- Часовой пояс -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Часовой пояс</h2>
      </template>
      <div class="max-w-xs">
        <USelect
          :model-value="settings.timezone"
          :items="timezoneItems"
          value-key="value"
          label-key="label"
          class="w-full"
          @update:model-value="onTimezoneChange"
        />
      </div>
    </UCard>

    <!-- Корреляция MAX -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Настройки корреляции MAX</h2>
      </template>
      <div class="space-y-2 max-w-xs">
        <UFormField label="Окно корреляции (секунды)">
          <UInput
            v-model="correlationWindowInput"
            type="number"
            :min="10"
            :max="300"
            class="w-full"
            @change="onCorrelationSave"
          />
        </UFormField>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Временное окно для связывания визита с подпиской в MAX. По умолчанию: 60 секунд.
        </p>
      </div>
    </UCard>

    <!-- Подключённые боты -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Подключённые боты</h2>
      </template>
      <div class="space-y-1">
        <p v-if="bots.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          Нет подключённых ботов
        </p>
        <div
          v-for="bot in bots"
          :key="bot.id"
          class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
        >
          <div class="flex items-center gap-3">
            <UBadge :color="bot.platform === 'telegram' ? 'primary' : 'info'" variant="subtle">
              {{ bot.platform === 'telegram' ? 'Telegram' : 'MAX' }}
            </UBadge>
            <div>
              <p class="text-sm font-medium">
                {{ bot.botName || bot.botUsername || `Бот #${bot.id}` }}
              </p>
              <p v-if="bot.botUsername" class="text-xs text-gray-500 dark:text-gray-400">
                @{{ bot.botUsername }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="bot.isActive ? 'success' : 'neutral'" variant="subtle">
              {{ bot.isActive ? 'Активен' : 'Неактивен' }}
            </UBadge>
            <UButton
              v-if="bot.isActive"
              size="xs"
              color="error"
              variant="ghost"
              @click="deactivateBot(bot.id)"
            >
              Отключить
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Информация о системе -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Информация о системе</h2>
      </template>
      <div v-if="systemInfo" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Версия</p>
          <p class="font-semibold">{{ systemInfo.version }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Каналов</p>
          <p class="font-semibold">{{ systemInfo.channels }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Подписчиков</p>
          <p class="font-semibold">{{ systemInfo.subscribers }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Ссылок</p>
          <p class="font-semibold">{{ systemInfo.links }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Размер БД</p>
          <p class="font-semibold">{{ formatDbSize(systemInfo.dbSize) }}</p>
        </div>
      </div>
    </UCard>

    <!-- Экспорт данных -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Экспорт данных</h2>
      </template>
      <div class="flex items-center gap-4">
        <UButton icon="i-heroicons-arrow-down-tray" @click="exportAll">
          Экспорт всех данных (CSV)
        </UButton>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Экспортирует все записи о подписчиках
        </p>
      </div>
    </UCard>
  </div>
</template>
