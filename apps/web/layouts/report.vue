<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Хедер публичного отчёта -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-3 px-6">
      <div class="max-w-5xl mx-auto flex items-center gap-3">
        <div class="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span class="text-white font-bold text-xs">ОП</span>
        </div>
        <span class="font-medium text-sm text-gray-700 dark:text-gray-300">ПодписачЪ</span>
        <UBadge label="Публичный отчёт" color="neutral" variant="subtle" size="xs" class="ml-auto" />
      </div>
    </header>

    <!-- Контент отчёта -->
    <main class="flex-1">
      <div class="max-w-5xl mx-auto py-6 px-4 lg:px-6">
        <slot />
      </div>
    </main>

    <!-- Footer с брендингом -->
    <AppFooter />
  </div>
</template>
