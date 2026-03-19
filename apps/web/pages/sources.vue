<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { sources, loading, period, channelId } = useSources()
const { channels, fetchChannels } = useChannels()

const onlyWithCosts = ref(false)

const filteredSources = computed(() => {
  if (!onlyWithCosts.value) return sources.value
  return sources.value.filter((s) => s.totalCost !== null)
})

onMounted(() => {
  fetchChannels()
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Источники трафика</h1>

    <SourcesFilter
      v-model:period="period"
      v-model:channel-id="channelId"
      v-model:only-with-costs="onlyWithCosts"
      :channels="channels"
    />

    <UCard>
      <SourcesTable :sources="filteredSources" :loading="loading" />
    </UCard>

    <UCard v-if="filteredSources.length">
      <SourcesChart :sources="filteredSources" />
    </UCard>
  </div>
</template>
