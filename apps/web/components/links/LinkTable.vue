<script setup lang="ts">
import type { InviteLink } from '~/composables/useLinks'
import { formatRelativeDate } from '~/composables/useSubscribers'

interface Props {
  links: InviteLink[]
  total: number
  page: number
  loading?: boolean
  typeFilter: 'all' | 'auto' | 'manual'
}

defineProps<Props>()

const emit = defineEmits<{
  'update:page': [page: number]
  'update:typeFilter': [type: 'all' | 'auto' | 'manual']
  revoke: [linkId: number]
}>()

type BadgeColor = 'success' | 'error' | 'neutral' | 'warning' | 'primary'

const columns = [
  { id: 'type', header: 'Тип' },
  { id: 'name', header: 'Название' },
  { id: 'url', header: 'URL' },
  { id: 'utm', header: 'UTM' },
  { id: 'clicks', header: 'Клики' },
  { id: 'joins', header: 'Подписок' },
  { id: 'cost', header: 'Затраты' },
  { id: 'cpf', header: 'CPF' },
  { id: 'status', header: 'Статус' },
  { id: 'date', header: 'Создана' },
  { id: 'actions', header: '' },
]

const typeOptions = [
  { label: 'Все', value: 'all' as const },
  { label: '🤖 Авто', value: 'auto' as const },
  { label: '✋ Ручные', value: 'manual' as const },
]

function getLinkStatus(link: InviteLink): { label: string; color: BadgeColor } {
  if (link.isRevoked) return { label: '🔴 Отозвана', color: 'error' }
  if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
    return { label: '⏰ Истекла', color: 'warning' }
  }
  return { label: '🟢 Активна', color: 'success' }
}

function getLinkName(link: InviteLink): string {
  if (link.name) return link.name
  if (link.visit) return `Визит #${link.visit.id}`
  return `Ссылка #${link.id}`
}

function getShortUrl(url: string): string {
  return '...' + url.slice(-10)
}

function getCpf(link: InviteLink): string {
  if (!link.costAmount || link.joinCount === 0) return '—'
  const cpf = (link.costAmount / link.joinCount).toFixed(2)
  return `${cpf} ${link.costCurrency ?? ''}`
}

function getUtmLabel(link: InviteLink): string {
  return link.utmSource ?? link.visit?.utmSource ?? '—'
}

function getUtmTooltip(link: InviteLink): string {
  const src = link.utmSource ?? link.visit?.utmSource
  const medium = link.utmMedium ?? link.visit?.utmMedium
  const campaign = link.utmCampaign ?? link.visit?.utmCampaign
  const parts = [
    src && `source: ${src}`,
    medium && `medium: ${medium}`,
    campaign && `campaign: ${campaign}`,
    link.utmContent && `content: ${link.utmContent}`,
    link.utmTerm && `term: ${link.utmTerm}`,
  ].filter(Boolean)
  return parts.join('\n') || '—'
}

async function copyUrl(url: string): Promise<void> {
  await navigator.clipboard.writeText(url)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Фильтр типа -->
    <div class="flex items-center gap-2">
      <span class="text-sm text-gray-500 dark:text-gray-400">Тип:</span>
      <UButtonGroup size="sm">
        <UButton
          v-for="opt in typeOptions"
          :key="opt.value"
          :color="typeFilter === opt.value ? 'primary' : 'neutral'"
          :variant="typeFilter === opt.value ? 'solid' : 'ghost'"
          @click="$emit('update:typeFilter', opt.value)"
        >
          {{ opt.label }}
        </UButton>
      </UButtonGroup>
    </div>

    <UTable :data="links" :columns="columns" :loading="loading">
      <template #type-cell="{ row }">
        <UBadge
          :label="row.original.type === 'auto' ? '🤖 Авто' : '✋ Ручная'"
          :color="(row.original.type === 'auto' ? 'neutral' : 'primary') as BadgeColor"
          variant="subtle"
          size="sm"
        />
      </template>

      <template #name-cell="{ row }">
        <span class="text-sm">{{ getLinkName(row.original) }}</span>
      </template>

      <template #url-cell="{ row }">
        <div class="flex items-center gap-1">
          <span class="text-xs font-mono text-gray-500">{{ getShortUrl(row.original.url) }}</span>
          <UButton
            icon="i-heroicons-clipboard"
            size="xs"
            variant="ghost"
            @click.stop="copyUrl(row.original.url)"
          />
        </div>
      </template>

      <template #utm-cell="{ row }">
        <UTooltip :text="getUtmTooltip(row.original)">
          <span class="text-sm text-gray-600 dark:text-gray-400 cursor-help underline decoration-dotted">
            {{ getUtmLabel(row.original) }}
          </span>
        </UTooltip>
      </template>

      <template #clicks-cell="{ row }">
        <span class="text-sm">{{ row.original.clickCount }}</span>
      </template>

      <template #joins-cell="{ row }">
        <span class="text-sm">{{ row.original.joinCount }}</span>
      </template>

      <template #cost-cell="{ row }">
        <span class="text-sm">
          {{ row.original.costAmount ? `${row.original.costAmount} ${row.original.costCurrency ?? ''}` : '—' }}
        </span>
      </template>

      <template #cpf-cell="{ row }">
        <span class="text-sm">{{ getCpf(row.original) }}</span>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :label="getLinkStatus(row.original).label"
          :color="getLinkStatus(row.original).color"
          variant="subtle"
          size="sm"
        />
      </template>

      <template #date-cell="{ row }">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ formatRelativeDate(row.original.createdAt) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <UButton
          v-if="!row.original.isRevoked"
          size="xs"
          variant="ghost"
          color="error"
          @click.stop="$emit('revoke', row.original.id)"
        >
          Отозвать
        </UButton>
      </template>
    </UTable>

    <div v-if="total > 50" class="flex justify-center">
      <UPagination
        :page="page"
        :total="total"
        :items-per-page="50"
        @update:page="$emit('update:page', $event)"
      />
    </div>
  </div>
</template>
