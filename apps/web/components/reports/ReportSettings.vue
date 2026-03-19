<script setup lang="ts">
import type { PublicReport } from '~/composables/useReports'

const props = defineProps<{
  report: PublicReport
}>()

const emit = defineEmits<{
  updated: [report: PublicReport]
  deleted: []
}>()

const { updateReport, deleteReport } = useReports()

// Форма
const name = ref(props.report.name)
const newPassword = ref('')
const clearPassword = ref(false)
const showSubscriberNames = ref(props.report.showSubscriberNames)
const showUtmDetails = ref(props.report.showUtmDetails)
const showCosts = ref(props.report.showCosts)
const isActive = ref(props.report.isActive)

const saving = ref(false)
const error = ref('')
const success = ref(false)

const copied = ref(false)

const reportLink = computed(() =>
  import.meta.client
    ? `${window.location.origin}/r/${props.report.token}`
    : `/r/${props.report.token}`,
)

async function copyLink(): Promise<void> {
  await navigator.clipboard.writeText(reportLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  success.value = false
  try {
    const body: {
      name: string
      showSubscriberNames: boolean
      showUtmDetails: boolean
      showCosts: boolean
      isActive: boolean
      password?: string | null
    } = {
      name: name.value.trim(),
      showSubscriberNames: showSubscriberNames.value,
      showUtmDetails: showUtmDetails.value,
      showCosts: showCosts.value,
      isActive: isActive.value,
    }

    if (clearPassword.value) {
      body.password = null
    } else if (newPassword.value) {
      body.password = newPassword.value
    }

    const updated = await updateReport(props.report.token, body)
    emit('updated', updated)
    success.value = true
    newPassword.value = ''
    clearPassword.value = false
    setTimeout(() => { success.value = false }, 3000)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e?.data?.message ?? e?.message ?? 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function deactivate(): Promise<void> {
  saving.value = true
  error.value = ''
  try {
    await deleteReport(props.report.token)
    emit('deleted')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e?.data?.message ?? e?.message ?? 'Не удалось деактивировать отчёт'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="font-semibold">{{ report.name }}</h3>
        <UBadge :color="report.isActive ? 'success' : 'neutral'" variant="subtle">
          {{ report.isActive ? 'Активен' : 'Неактивен' }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Публичная ссылка -->
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Публичная ссылка
        </label>
        <div class="flex gap-2">
          <UInput :model-value="reportLink" readonly class="flex-1 font-mono text-sm" />
          <UButton
            :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
            :color="copied ? 'success' : 'neutral'"
            variant="outline"
            @click="copyLink"
          />
        </div>
      </div>

      <!-- Название -->
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Название
        </label>
        <UInput v-model="name" placeholder="Название отчёта" />
      </div>

      <!-- Новый пароль -->
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Новый пароль
          <span class="text-gray-400 font-normal text-xs">(оставьте пустым, чтобы не менять)</span>
        </label>
        <UInput v-model="newPassword" type="password" placeholder="Введите новый пароль" :disabled="clearPassword" />
        <div class="flex items-center gap-2 mt-2">
          <UToggle v-model="clearPassword" size="xs" :disabled="!!newPassword" />
          <span class="text-xs text-gray-500 dark:text-gray-400">Убрать пароль (открытый доступ)</span>
        </div>
      </div>

      <!-- Видимость -->
      <div class="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-800">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide pt-1">Видимость данных</p>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Имена подписчиков</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Показывать имена и юзернеймы</div>
          </div>
          <UToggle v-model="showSubscriberNames" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">UTM-метки</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Источники трафика и кампании</div>
          </div>
          <UToggle v-model="showUtmDetails" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Затраты</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Бюджеты и стоимость подписчика</div>
          </div>
          <UToggle v-model="showCosts" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-medium">Отчёт активен</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Выключите, чтобы скрыть ссылку</div>
          </div>
          <UToggle v-model="isActive" />
        </div>
      </div>

      <!-- Статусы и кнопки -->
      <div v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>
      <div v-if="success" class="text-sm text-green-600 dark:text-green-400">✅ Настройки сохранены</div>

      <div class="flex items-center justify-between pt-1">
        <UButton :loading="saving" @click="save">Сохранить</UButton>
        <UButton color="error" variant="outline" :loading="saving" @click="deactivate">
          Деактивировать
        </UButton>
      </div>
    </div>
  </UCard>
</template>
