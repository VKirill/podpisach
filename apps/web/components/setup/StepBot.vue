<script setup lang="ts">
const { connectBot, loading, error, botUsername } = useSetup()

const token = ref('')
const success = ref(false)

async function handleSubmit() {
  success.value = false
  const ok = await connectBot(token.value)
  if (ok) {
    success.value = true
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      Подключите Telegram-бота
    </h2>

    <!-- Инструкция -->
    <div
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
    >
      <p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Как получить токен:</p>
      <ol class="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
        <li>Откройте <strong>@BotFather</strong> в Telegram</li>
        <li>Отправьте команду <strong>/newbot</strong></li>
        <li>Следуйте инструкциям, придумайте имя и username</li>
        <li>Скопируйте токен и вставьте ниже</li>
      </ol>
    </div>

    <!-- Успех -->
    <div
      v-if="success"
      class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4 text-green-700 dark:text-green-300 text-sm"
    >
      ✅ Бот @{{ botUsername }} работает!
    </div>

    <!-- Ошибка -->
    <div
      v-if="error && !success"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-red-700 dark:text-red-300 text-sm"
    >
      ❌ {{ error }}
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <UFormField label="Токен бота">
        <UInput
          v-model="token"
          placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
          :disabled="loading"
          class="w-full font-mono"
        />
      </UFormField>

      <UButton
        type="submit"
        color="primary"
        class="w-full justify-center"
        :loading="loading"
        :disabled="loading || !token"
      >
        Проверить и подключить
      </UButton>
    </form>
  </div>
</template>
