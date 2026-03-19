<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { channels, loading, fetchChannels, deleteChannel } = useChannels()
const showAddModal = ref(false)

await fetchChannels()

async function handleDelete(id: number): Promise<void> {
  await deleteChannel(id)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Каналы</h1>
    </div>

    <ChannelList
      :channels="channels"
      :loading="loading"
      @add="showAddModal = true"
      @delete="handleDelete"
    />

    <AddChannelModal
      v-model="showAddModal"
      @added="fetchChannels"
    />
  </div>
</template>
