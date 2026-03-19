<script setup lang="ts">
definePageMeta({ layout: 'report' })

const route = useRoute()
const token = route.params.token as string
const { data, needsPassword, reportName, loading, error, authenticate } = useReport(token)

const passwordError = ref('')
const authLoading = ref(false)

async function handleAuth(password: string): Promise<void> {
  passwordError.value = ''
  authLoading.value = true
  try {
    await authenticate(password)
  } catch {
    passwordError.value = 'Неверный пароль'
  } finally {
    authLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Загрузка -->
    <div v-if="loading" class="flex justify-center py-24">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Ошибка (отчёт не найден или недоступен) -->
    <div v-else-if="error" class="flex justify-center py-16">
      <EmptyState
        icon="i-heroicons-exclamation-triangle"
        title="Отчёт не найден"
        :description="error"
      />
    </div>

    <!-- Форма пароля -->
    <div v-else-if="needsPassword">
      <ReportsReportPasswordForm
        :report-name="reportName"
        :error="passwordError"
        @submit="handleAuth"
      />
    </div>

    <!-- Дашборд отчёта -->
    <div v-else-if="data">
      <ReportsPublicReportView :data="data" />
    </div>
  </div>
</template>
