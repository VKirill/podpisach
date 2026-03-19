<script setup lang="ts">
interface Bot {
  id: number
  platform: string
  botUsername: string | null
  botName: string | null
}

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ added: [] }>()

const { addChannel } = useChannels()

const bots = ref<Bot[]>([])
const botsLoading = ref(false)
const selectedBotId = ref<number | null>(null)
const channelId = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const botOptions = computed(() =>
  bots.value.map(b => ({
    label: b.botName ? `${b.botName} (@${b.botUsername})` : `@${b.botUsername ?? b.id}`,
    value: b.id,
  }))
)

async function loadBots(): Promise<void> {
  botsLoading.value = true
  try {
    const data = await $fetch<{ bots: Bot[] }>('/api/bots')
    bots.value = data.bots
    if (data.bots.length === 1) {
      selectedBotId.value = data.bots[0]!.id
    }
  } catch {
    error.value = 'Не удалось загрузить список ботов'
  } finally {
    botsLoading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  if (!selectedBotId.value || !channelId.value.trim()) return
  loading.value = true
  error.value = ''
  success.value = false
  try {
    await addChannel(channelId.value.trim(), selectedBotId.value)
    success.value = true
    channelId.value = ''
    emit('added')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e?.data?.message ?? e?.message ?? 'Не удалось подключить канал'
  } finally {
    loading.value = false
  }
}

function handleClose(): void {
  open.value = false
  channelId.value = ''
  error.value = ''
  success.value = false
}

watch(open, (val) => {
  if (val) {
    success.value = false
    error.value = ''
    channelId.value = ''
    loadBots()
  }
})
</script>

<template>
  <UModal v-model:open="open" title="Добавить канал">
    <template #body>
      <div class="space-y-4">
        <!-- Инструкция -->
        <div class="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          Добавьте бота администратором в ваш канал, затем введите @username или числовой ID канала.
        </div>

        <!-- Успех -->
        <div
          v-if="success"
          class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300 text-sm"
        >
          ✅ Канал успешно подключён!
        </div>

        <!-- Ошибка -->
        <div
          v-if="error"
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm"
        >
          ❌ {{ error }}
        </div>

        <!-- Выбор бота -->
        <UFormField label="Бот">
          <USelect
            v-model="selectedBotId"
            :items="botOptions"
            value-key="value"
            label-key="label"
            placeholder="Выберите бота"
            :loading="botsLoading"
            :disabled="botsLoading || bots.length <= 1"
            class="w-full"
          />
        </UFormField>

        <!-- ID канала -->
        <UFormField label="ID или @username канала">
          <UInput
            v-model="channelId"
            placeholder="@mychannel или -1001234567890"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="ghost" @click="handleClose">Отмена</UButton>
        <UButton
          color="primary"
          :loading="loading"
          :disabled="loading || !selectedBotId || !channelId.trim()"
          @click="handleSubmit"
        >
          Подключить
        </UButton>
      </div>
    </template>
  </UModal>
</template>
