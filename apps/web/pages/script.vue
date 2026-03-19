<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const selectedChannelId = ref<number | undefined>(undefined)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">JS-скрипт для сайта</h1>
      <p class="text-gray-500 mt-1">
        Установите скрипт на ваш лендинг для отслеживания источников подписчиков.
      </p>
    </div>

    <ScriptGenerator v-model="selectedChannelId" />

    <UDivider />

    <ScriptTester :channel-id="selectedChannelId" />
  </div>
</template>
