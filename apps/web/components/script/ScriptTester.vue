<script setup lang="ts">
const props = defineProps<{
  channelId: number | undefined
}>()

const testUrl = ref('')
const isLoading = ref(false)
const result = ref<{
  success: boolean
  inviteUrl?: string
  message?: string
} | null>(null)

async function runTest(): Promise<void> {
  if (!props.channelId) return

  isLoading.value = true
  result.value = null

  try {
    const data = await $fetch<{ sessionId: string; invite_url?: string }>('/api/track', {
      method: 'POST',
      body: {
        channelId: props.channelId,
        utmSource: 'test',
        utmMedium: 'op_test',
        url: testUrl.value || undefined,
      },
    })

    result.value = {
      success: true,
      inviteUrl: data.invite_url,
      message: 'Тестовый визит зарегистрирован.',
    }
  } catch (err) {
    const e = err as { data?: { message?: string }; message?: string }
    result.value = {
      success: false,
      message: e.data?.message ?? e.message ?? 'Неизвестная ошибка',
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">Проверка работоспособности</h2>
    </template>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">URL вашего сайта (опционально)</label>
        <UInput
          v-model="testUrl"
          type="url"
          placeholder="https://example.com/landing"
        />
      </div>

      <UAlert
        v-if="!channelId"
        color="neutral"
        icon="i-heroicons-information-circle"
        description="Сначала выберите канал в генераторе выше."
      />

      <UButton
        :loading="isLoading"
        :disabled="!channelId"
        icon="i-heroicons-play"
        @click="runTest"
      >
        Проверить
      </UButton>

      <template v-if="result">
        <UAlert
          v-if="result.success"
          color="success"
          icon="i-heroicons-check-circle"
          title="Скрипт работает!"
          :description="result.inviteUrl
            ? 'Тестовый визит зарегистрирован. Invite-ссылка получена.'
            : 'Тестовый визит зарегистрирован. Invite-ссылка не получена — бот не подключён или нет прав администратора.'"
        />

        <div
          v-if="result.success && result.inviteUrl"
          class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
        >
          <p class="text-sm font-medium mb-1">Тестовая invite-ссылка:</p>
          <a
            :href="result.inviteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary-500 hover:underline break-all"
          >
            {{ result.inviteUrl }}
          </a>
        </div>

        <UAlert
          v-if="!result.success"
          color="error"
          icon="i-heroicons-x-circle"
          title="Ошибка"
          :description="`${result.message}. Проверьте установку скрипта.`"
        />
      </template>
    </div>
  </UCard>
</template>
