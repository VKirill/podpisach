<script setup lang="ts">
const props = defineProps<{
  channelId: number
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  created: [token: string]
}>()

const { createReport } = useReports()

const localOpen = computed({
  get: () => props.open,
  set: (val: boolean) => { if (!val) handleClose() },
})

// Форма
const name = ref('')
const password = ref('')
const showSubscriberNames = ref(false)
const showUtmDetails = ref(true)
const showCosts = ref(true)
const loading = ref(false)
const error = ref('')

// Состояние после создания
const createdToken = ref('')
const copied = ref(false)

const reportLink = computed(() =>
  createdToken.value && import.meta.client
    ? `${window.location.origin}/r/${createdToken.value}`
    : '',
)

async function submit(): Promise<void> {
  if (!name.value.trim()) {
    error.value = 'Введите название отчёта'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const body: {
      channelId: number
      name: string
      password?: string
      showSubscriberNames: boolean
      showUtmDetails: boolean
      showCosts: boolean
    } = {
      channelId: props.channelId,
      name: name.value.trim(),
      showSubscriberNames: showSubscriberNames.value,
      showUtmDetails: showUtmDetails.value,
      showCosts: showCosts.value,
    }
    if (password.value) body.password = password.value
    const result = await createReport(body)
    createdToken.value = result.token
    emit('created', result.token)
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e?.data?.message ?? e?.message ?? 'Ошибка создания отчёта'
  } finally {
    loading.value = false
  }
}

async function copyLink(): Promise<void> {
  await navigator.clipboard.writeText(reportLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function handleClose(): void {
  name.value = ''
  password.value = ''
  showSubscriberNames.value = false
  showUtmDetails.value = true
  showCosts.value = true
  error.value = ''
  createdToken.value = ''
  emit('close')
}
</script>

<template>
  <UModal v-model:open="localOpen" title="Создать публичный отчёт">
    <template #body>
      <!-- Состояние после создания -->
      <div v-if="createdToken" class="space-y-4">
        <div class="flex items-center gap-2 text-green-600 dark:text-green-400">
          <UIcon name="i-heroicons-check-circle" class="text-xl" />
          <span class="font-medium">Отчёт создан!</span>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
        <UButton class="w-full" variant="outline" @click="handleClose">Закрыть</UButton>
      </div>

      <!-- Форма -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Название отчёта <span class="text-red-500">*</span>
          </label>
          <UInput v-model="name" placeholder="Отчёт для клиента Иванов" />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Пароль <span class="text-gray-400 font-normal text-xs">(необязательно)</span>
          </label>
          <UInput
            v-model="password"
            type="password"
            placeholder="Оставьте пустым для открытого доступа"
          />
        </div>

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
        </div>

        <div v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>
      </div>
    </template>

    <template v-if="!createdToken" #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="ghost" @click="handleClose">Отмена</UButton>
        <UButton :loading="loading" @click="submit">Создать отчёт</UButton>
      </div>
    </template>
  </UModal>
</template>
