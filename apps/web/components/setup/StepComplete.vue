<script setup lang="ts">
const { loading, error, botUsername, channelTitle } = useSetup()
const { checkSession } = useAuth()

async function handleComplete() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/setup/complete', { method: 'POST' })
    await checkSession()
    await navigateTo('/')
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      const data = (err as { data?: { message?: string } }).data
      error.value = data?.message ?? 'Не удалось завершить настройку'
    } else {
      error.value = 'Не удалось завершить настройку'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="text-center">
    <UIcon name="i-heroicons-check-circle" class="text-green-500 w-16 h-16 mx-auto mb-4" />

    <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Всё готово!</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Система успешно настроена и готова к работе
    </p>

    <!-- Сводка -->
    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left space-y-2"
    >
      <div class="flex items-center gap-2 text-sm">
        <UIcon name="i-heroicons-cpu-chip" class="text-blue-500 w-4 h-4 flex-shrink-0" />
        <span class="text-gray-500 dark:text-gray-400">Бот:</span>
        <span class="font-medium text-gray-900 dark:text-white">@{{ botUsername }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <UIcon name="i-heroicons-megaphone" class="text-purple-500 w-4 h-4 flex-shrink-0" />
        <span class="text-gray-500 dark:text-gray-400">Канал:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ channelTitle }}</span>
      </div>
    </div>

    <!-- Подсказка -->
    <p class="text-xs text-gray-400 dark:text-gray-500 mb-6">
      <UIcon name="i-heroicons-information-circle" class="w-3.5 h-3.5 inline mr-1 align-middle" />
      Следующий шаг: установите JS-скрипт на ваш сайт для отслеживания
    </p>

    <!-- Ошибка -->
    <div
      v-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-red-700 dark:text-red-300 text-sm"
    >
      {{ error }}
    </div>

    <UButton
      color="primary"
      class="w-full justify-center"
      :loading="loading"
      :disabled="loading"
      @click="handleComplete"
    >
      Перейти к дашборду
    </UButton>
  </div>
</template>
