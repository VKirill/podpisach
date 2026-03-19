<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { login, checkSession, setupCompleted } = useAuth()

const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleSubmit() {
  if (!password.value || submitting.value) return
  submitting.value = true
  error.value = ''

  const result = await login(password.value)

  if (result.success) {
    await checkSession()
    await navigateTo(setupCompleted.value ? '/' : '/setup')
  } else {
    error.value = result.error ?? 'Неверный пароль'
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Вход</h2>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Введите пароль для доступа к дашборду</p>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <UFormField label="Пароль" :error="error">
        <UInput
          v-model="password"
          type="password"
          placeholder="Введите пароль"
          :disabled="submitting"
          class="w-full"
          autofocus
        />
      </UFormField>

      <UButton
        type="submit"
        color="primary"
        class="w-full justify-center"
        :loading="submitting"
        :disabled="!password || submitting"
      >
        Войти
      </UButton>
    </form>
  </div>
</template>
