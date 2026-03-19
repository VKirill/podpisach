export interface SourceRow {
  source: string | null
  medium: string | null
  campaign: string | null
  visits: number
  subscribers: number
  conversionPct: number
  totalCost: number | null
  costCurrency: string | null
  costPerSubscriber: number | null
}

interface SourcesResponse {
  sources: SourceRow[]
}

export function useSources() {
  const period = ref('30d')
  const channelId = ref<number | null>(null)

  const { data, status } = useFetch<SourcesResponse>('/api/sources', {
    query: { period, channelId },
  })

  const sources = computed(() => data.value?.sources ?? [])
  const loading = computed(() => status.value === 'pending')

  return { sources, loading, period, channelId }
}
