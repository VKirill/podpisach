<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-bold">Интеграции</h1>

    <!-- Яндекс Метрика -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <span class="text-lg font-semibold">🟡 Яндекс Метрика</span>
      </div>
      <YandexMetrikaForm />
    </section>

    <!-- Google Analytics -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <span class="text-lg font-semibold">🔵 Google Analytics</span>
      </div>
      <GoogleAnalyticsForm />
    </section>
  </div>
</template>
