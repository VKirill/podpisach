<script setup lang="ts">
const { setPassword, loading, error } = useSetup()

const password = ref('')
const confirm = ref('')
const localError = ref('')

async function handleSubmit() {
  localError.value = ''
  if (password.value.length < 8) {
    localError.value = 'Пароль должен содержать минимум 8 символов'
    return
  }
  if (password.value !== confirm.value) {
    localError.value = 'Пароли не совпадают'
    return
  }
  await setPassword(password.value)
}
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      Создайте пароль администратора
    </h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Этот пароль потребуется для входа в панель управления
    </p>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <UFormField label="Пароль" :error="localError || error">
        <UInput
          v-model="password"
          type="password"
          placeholder="Минимум 8 символов"
          :disabled="loading"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Подтвердите пароль">
        <UInput
          v-model="confirm"
          type="password"
          placeholder="Повторите пароль"
          :disabled="loading"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        color="primary"
        class="w-full justify-center mt-6"
        :loading="loading"
        :disabled="loading || !password || !confirm"
      >
        Далее
      </UButton>
    </form>
  </div>
</template>
