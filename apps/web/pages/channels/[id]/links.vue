<script setup lang="ts">
import { useLinks } from '~/composables/useLinks'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const channelId = computed(() => Number(route.params.id))

const { links, loading, typeFilter, page, total, refresh, revokeLink } = useLinks(channelId)

const showCreateModal = ref(false)

async function handleRevoke(linkId: number): Promise<void> {
  await revokeLink(linkId)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Заголовок -->
    <div class="flex items-center justify-between gap-4">
      <h2 class="text-xl font-semibold">Ссылки</h2>
      <UButton icon="i-heroicons-plus" @click="showCreateModal = true">
        Создать ссылку
      </UButton>
    </div>

    <!-- Таблица -->
    <template v-if="links.length || loading">
      <LinkTable
        :links="links"
        :total="total"
        :page="page"
        :loading="loading"
        :type-filter="typeFilter"
        @update:type-filter="typeFilter = $event"
        @update:page="page = $event"
        @revoke="handleRevoke"
      />
    </template>

    <EmptyState
      v-else
      icon="i-heroicons-link"
      title="Ссылок пока нет"
      description="Ссылки создаются автоматически при переходах на лендинг или вручную через кнопку выше."
    />

    <!-- Модалка создания ручной ссылки -->
    <CreateLinkModal
      v-model:open="showCreateModal"
      :channel-id="channelId"
      @created="refresh"
    />
  </div>
</template>
