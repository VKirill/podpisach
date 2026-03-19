export interface InviteLinkVisit {
  id: number
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

export interface InviteLink {
  id: number
  url: string
  name: string | null
  type: 'auto' | 'manual'
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
  costAmount: number | null
  costCurrency: string | null
  clickCount: number
  joinCount: number
  isRevoked: boolean
  expiresAt: string | null
  createdAt: string
  visit: InviteLinkVisit | null
}

interface LinksResponse {
  items: InviteLink[]
  total: number
  page: number
  pages: number
}

interface CreateLinkPayload {
  name?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  costAmount?: number
  costCurrency?: string
}

interface UpdateCostPayload {
  name?: string
  costAmount?: number
  costCurrency?: string
}

export function useLinks(channelId: Ref<number>) {
  const typeFilter = ref<'all' | 'auto' | 'manual'>('all')
  const page = ref(1)

  watch(typeFilter, () => {
    page.value = 1
  })

  const { data, status: fetchStatus, refresh } = useFetch<LinksResponse>(
    () => `/api/channels/${channelId.value}/links`,
    {
      query: { type: typeFilter, page, limit: 50 },
    },
  )

  const links = computed(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const pages = computed(() => data.value?.pages ?? 1)
  const loading = computed(() => fetchStatus.value === 'pending')

  async function createManualLink(payload: CreateLinkPayload): Promise<{ url: string; linkId: number }> {
    const result = await $fetch<{ url: string; linkId: number }>('/api/links', {
      method: 'POST',
      body: { channelId: channelId.value, ...payload },
    })
    await refresh()
    return result
  }

  async function updateCost(linkId: number, cost: UpdateCostPayload): Promise<void> {
    await $fetch(`/api/links/${linkId}`, {
      method: 'PATCH',
      body: cost,
    })
    await refresh()
  }

  async function revokeLink(linkId: number): Promise<void> {
    await $fetch(`/api/links/${linkId}`, { method: 'DELETE' })
    await refresh()
  }

  return {
    links,
    loading,
    typeFilter,
    page,
    pages,
    total,
    refresh,
    createManualLink,
    updateCost,
    revokeLink,
  }
}
