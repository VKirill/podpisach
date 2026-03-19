<script setup lang="ts">
import type { SourceRow } from '~/composables/useSources'

interface Props {
  sources: SourceRow[]
  loading?: boolean
}

interface FlatRow {
  id: string
  depth: 0 | 1 | 2
  sourceKey: string
  mediumKey: string
  label: string
  mediumLabel: string
  campaignLabel: string
  expandable: boolean
  expanded: boolean
  visits: number
  subscribers: number
  conversionPct: number
  totalCost: number | null
  costCurrency: string | null
  costPerSubscriber: number | null
}

const props = defineProps<Props>()

const expandedSources = ref(new Set<string>())
const expandedMediums = ref(new Set<string>())

function toLabel(s: string | null): string {
  if (!s || s === '(direct)') return 'Прямой трафик'
  return s
}

function aggregate(rows: SourceRow[]) {
  const visits = rows.reduce((s, r) => s + r.visits, 0)
  const subscribers = rows.reduce((s, r) => s + r.subscribers, 0)
  const conversionPct = visits > 0 ? parseFloat(((subscribers / visits) * 100).toFixed(1)) : 0
  const costRow = rows.find((r) => r.totalCost !== null)
  return {
    visits,
    subscribers,
    conversionPct,
    totalCost: costRow?.totalCost ?? null,
    costCurrency: costRow?.costCurrency ?? null,
    costPerSubscriber: costRow?.costPerSubscriber ?? null,
  }
}

const flatRows = computed<FlatRow[]>(() => {
  const rows: FlatRow[] = []

  const bySource = new Map<string, SourceRow[]>()
  for (const row of props.sources) {
    const key = row.source ?? '(direct)'
    if (!bySource.has(key)) bySource.set(key, [])
    bySource.get(key)!.push(row)
  }

  for (const [sourceKey, sourceRows] of bySource) {
    const agg = aggregate(sourceRows)
    const isExpanded = expandedSources.value.has(sourceKey)
    const hasMediums = sourceRows.some((r) => r.medium)

    rows.push({
      id: `s:${sourceKey}`,
      depth: 0,
      sourceKey,
      mediumKey: '',
      label: toLabel(sourceKey),
      mediumLabel: '—',
      campaignLabel: '—',
      expandable: hasMediums,
      expanded: isExpanded,
      ...agg,
    })

    if (!isExpanded) continue

    const byMedium = new Map<string, SourceRow[]>()
    for (const row of sourceRows) {
      const key = row.medium ?? ''
      if (!byMedium.has(key)) byMedium.set(key, [])
      byMedium.get(key)!.push(row)
    }

    for (const [mediumKey, mediumRows] of byMedium) {
      const medAgg = aggregate(mediumRows)
      const medId = `${sourceKey}|${mediumKey}`
      const isMedExpanded = expandedMediums.value.has(medId)
      const hasCampaigns = mediumRows.some((r) => r.campaign)

      rows.push({
        id: `m:${medId}`,
        depth: 1,
        sourceKey,
        mediumKey,
        label: mediumKey || '(нет)',
        mediumLabel: mediumKey || '—',
        campaignLabel: '—',
        expandable: hasCampaigns,
        expanded: isMedExpanded,
        ...medAgg,
      })

      if (!isMedExpanded) continue

      for (const campRow of mediumRows) {
        rows.push({
          id: `c:${sourceKey}|${mediumKey}|${campRow.campaign ?? ''}`,
          depth: 2,
          sourceKey,
          mediumKey,
          label: campRow.campaign || '(нет)',
          mediumLabel: mediumKey || '—',
          campaignLabel: campRow.campaign || '—',
          expandable: false,
          expanded: false,
          visits: campRow.visits,
          subscribers: campRow.subscribers,
          conversionPct: campRow.conversionPct,
          totalCost: campRow.totalCost,
          costCurrency: campRow.costCurrency,
          costPerSubscriber: campRow.costPerSubscriber,
        })
      }
    }
  }

  return rows
})

function toggleRow(row: FlatRow): void {
  if (!row.expandable) return

  if (row.depth === 0) {
    const next = new Set(expandedSources.value)
    if (next.has(row.sourceKey)) {
      next.delete(row.sourceKey)
      // Свернуть все медиумы под этим источником
      const nextMed = new Set(expandedMediums.value)
      for (const k of nextMed) {
        if (k.startsWith(`${row.sourceKey}|`)) nextMed.delete(k)
      }
      expandedMediums.value = nextMed
    } else {
      next.add(row.sourceKey)
    }
    expandedSources.value = next
  } else if (row.depth === 1) {
    const medId = `${row.sourceKey}|${row.mediumKey}`
    const next = new Set(expandedMediums.value)
    if (next.has(medId)) next.delete(medId)
    else next.add(medId)
    expandedMediums.value = next
  }
}

const columns = [
  { id: 'source', header: 'Источник' },
  { id: 'medium', header: 'Канал' },
  { id: 'campaign', header: 'Кампания' },
  { id: 'visits', header: 'Визитов' },
  { id: 'subscribers', header: 'Подписчиков' },
  { id: 'conversion', header: 'Конверсия' },
  { id: 'costs', header: 'Затраты' },
  { id: 'cpf', header: 'CPF' },
]
</script>

<template>
  <UTable :data="flatRows" :columns="columns" :loading="loading">
    <template #source-cell="{ row }">
      <div
        class="flex items-center gap-1.5 select-none"
        :class="{ 'cursor-pointer': (row.original as FlatRow).expandable }"
        :style="{ paddingLeft: `${(row.original as FlatRow).depth * 20}px` }"
        @click="toggleRow(row.original as FlatRow)"
      >
        <UIcon
          v-if="(row.original as FlatRow).expandable"
          :name="(row.original as FlatRow).expanded ? 'i-heroicons-chevron-down-20-solid' : 'i-heroicons-chevron-right-20-solid'"
          class="w-4 h-4 flex-shrink-0 text-gray-400"
        />
        <span v-else class="w-4 flex-shrink-0" />
        <span
          class="text-sm truncate max-w-44"
          :class="{ 'font-medium': (row.original as FlatRow).depth === 0 }"
        >
          {{ (row.original as FlatRow).label }}
        </span>
      </div>
    </template>

    <template #medium-cell="{ row }">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ (row.original as FlatRow).mediumLabel }}
      </span>
    </template>

    <template #campaign-cell="{ row }">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ (row.original as FlatRow).campaignLabel }}
      </span>
    </template>

    <template #visits-cell="{ row }">
      <span class="text-sm">{{ formatNumber((row.original as FlatRow).visits) }}</span>
    </template>

    <template #subscribers-cell="{ row }">
      <span class="text-sm font-medium">{{ formatNumber((row.original as FlatRow).subscribers) }}</span>
    </template>

    <template #conversion-cell="{ row }">
      <span class="text-sm">{{ (row.original as FlatRow).conversionPct }}%</span>
    </template>

    <template #costs-cell="{ row }">
      <span class="text-sm">
        {{ (row.original as FlatRow).totalCost !== null
          ? formatCurrency((row.original as FlatRow).totalCost!, (row.original as FlatRow).costCurrency ?? 'EUR')
          : '—' }}
      </span>
    </template>

    <template #cpf-cell="{ row }">
      <span class="text-sm">
        {{ (row.original as FlatRow).costPerSubscriber !== null
          ? formatCurrency((row.original as FlatRow).costPerSubscriber!, (row.original as FlatRow).costCurrency ?? 'EUR')
          : '—' }}
      </span>
    </template>
  </UTable>
</template>
