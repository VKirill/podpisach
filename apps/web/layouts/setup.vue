<script setup lang="ts">
const { currentStep, totalSteps } = useSetup()
const progressWidth = computed(() => `${(currentStep.value / totalSteps) * 100}%`)
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-start bg-gray-50 dark:bg-gray-950 py-10 px-4">
    <!-- Логотип -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-4">
        <span class="text-white font-bold text-lg">ОП</span>
      </div>
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">Откуда подписчик</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Первоначальная настройка</p>
    </div>

    <!-- Прогресс-индикатор -->
    <div class="w-full max-w-lg mb-8">
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
        <span>Настройка</span>
        <span>Шаг {{ currentStep }} из {{ totalSteps }}</span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
        <div
          class="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
          :style="{ width: progressWidth }"
        />
      </div>
    </div>

    <!-- Контент wizard -->
    <div class="w-full max-w-lg">
      <UCard>
        <slot />
      </UCard>
    </div>
  </div>
</template>
