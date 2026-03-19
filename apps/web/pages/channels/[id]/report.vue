<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const id = computed(() => Number(route.params.id))

const { reports, loading, error, fetchReports } = useReports()

await fetchReports(id.value)

const showCreateModal = ref(false)

async function onCreated(): Promise<void> {
  showCreateModal.value = false
  await fetchReports(id.value)
}

async function onUpdated(): Promise<void> {
  await fetchReports(id.value)
}

async function onDeleted(): Promise<void> {
  await fetchReports(id.value)
}

// Навигация по вкладкам
const tabPaths = [
  `/channels/${id.value}`,
  `/channels/${id.value}/subscribers`,
  `/channels/${id.value}/links`,
  `/channels/${id.value}/report`,
]
const tabItems = [
  { label: 'Обзор' },
  { label: 'Подписчики' },
  { label: 'Ссылки' },
  { label: 'Отчёт' },
]

function handleTabChange(index: number): void {
  const path = tabPaths[index]
  if (path) router.push(path)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Навигация -->
    <UTabs :items="tabItems" :default-index="3" @change="handleTabChange" />

    <!-- Заголовок -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">Публичный отчёт</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Настройте ссылку для отправки клиенту
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        @click="showCreateModal = true"
      >
        Создать отчёт
      </UButton>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="text-center py-8 text-gray-500">
      Загрузка...
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</div>

    <!-- Нет отчётов -->
    <UCard v-else-if="!reports.length">
      <div class="text-center py-8 space-y-3">
        <UIcon name="i-heroicons-document-text" class="text-4xl text-gray-400 mx-auto block" />
        <p class="text-gray-500 dark:text-gray-400">Публичных отчётов ещё нет</p>
        <UButton icon="i-heroicons-plus" variant="outline" @click="showCreateModal = true">
          Создать первый отчёт
        </UButton>
      </div>
    </UCard>

    <!-- Список отчётов -->
    <div v-else class="space-y-4">
      <ReportsReportSettings
        v-for="report in reports"
        :key="report.token"
        :report="report"
        @updated="onUpdated"
        @deleted="onDeleted"
      />
    </div>

    <!-- Модалка создания -->
    <ReportsCreateReportModal
      :channel-id="id"
      :open="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>
