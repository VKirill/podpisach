<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-code-bracket"
      title="JS-скрипт"
      description="Генератор JS-сниппета для установки на лендинг."
    />
  </div>
</template>
