<script setup lang="ts">
const { addChannel, loading, error, botUsername, channelTitle } = useSetup()

const channelId = ref('')
const success = ref(false)

async function handleSubmit() {
  success.value = false
  const ok = await addChannel(channelId.value)
  if (ok) {
    success.value = true
  }
}
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Добавьте канал</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Добавьте бота <strong>@{{ botUsername || 'вашего бота' }}</strong> администратором в ваш
      Telegram-канал, затем введите ID или @username канала
    </p>

    <!-- Успех -->
    <div
      v-if="success"
      class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4 text-green-700 dark:text-green-300 text-sm"
    >
      ✅ Канал &quot;{{ channelTitle }}&quot; подключён!
    </div>

    <!-- Ошибка -->
    <div
      v-if="error && !success"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-red-700 dark:text-red-300 text-sm"
    >
      ❌ {{ error }}
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <UFormField label="ID или @username канала">
        <UInput
          v-model="channelId"
          placeholder="@mychannel или -1001234567890"
          :disabled="loading"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        color="primary"
        class="w-full justify-center"
        :loading="loading"
        :disabled="loading || !channelId"
      >
        Проверить и подключить
      </UButton>
    </form>
  </div>
</template>
