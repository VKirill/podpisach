<script setup lang="ts">
interface Props {
  reportName: string
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  error: '',
})

const emit = defineEmits<{
  submit: [password: string]
}>()

const password = ref('')
const loading = ref(false)

// Сбрасываем loading когда родитель ответил (ошибка изменилась или auth прошёл)
watch(
  () => props.error,
  () => {
    loading.value = false
  }
)

function handleSubmit(): void {
  if (!password.value || loading.value) return
  loading.value = true
  emit('submit', password.value)
}
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh] px-4">
    <UCard class="w-full max-w-sm">
      <div class="text-center mb-6">
        <div class="flex justify-center mb-3">
          <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UIcon name="i-heroicons-lock-closed" class="w-7 h-7 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Защищённый отчёт</h2>
        <p v-if="reportName" class="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
          {{ reportName }}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Введите пароль для просмотра</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <UInput
          v-model="password"
          type="password"
          placeholder="Пароль"
          size="lg"
          autofocus
        />
        <p v-if="error" class="text-sm text-red-500 text-center">{{ error }}</p>
        <UButton
          type="submit"
          label="Войти"
          color="primary"
          size="lg"
          block
          :loading="loading"
          :disabled="!password"
        />
      </form>
    </UCard>
  </div>
</template>
