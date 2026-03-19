<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div>
    <EmptyState
      icon="i-heroicons-chart-pie"
      title="Источники трафика"
      description="Аналитика по UTM-меткам: utm_source, utm_medium, utm_campaign с конверсией."
    />
  </div>
</template>
