import type { Platform } from '@op/shared'

export interface SubscriberVisit {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
}

export interface SubscriberInviteLink {
  id: number
  name: string | null
  url: string
  type: string
}

export interface Subscriber {
  id: number
  platform: Platform
  platformUserId: string
  firstName: string | null
  lastName: string | null
  username: string | null
  attributionConfidence: number
  status: 'active' | 'left' | 'kicked' | 'banned'
  subscribedAt: string
  leftAt: string | null
  visit: SubscriberVisit | null
  inviteLink: SubscriberInviteLink | null
  createdAt: string
  updatedAt: string
}

interface SubscribersResponse {
  items: Subscriber[]
  total: number
  page: number
  pages: number
  sources: string[]
}

export function formatRelativeDate(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffDay = Math.floor(diffMs / 86400000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffMin = Math.floor(diffMs / 60000)
  if (diffDay > 30) return new Date(dateStr).toLocaleDateString('ru-RU')
  if (diffDay > 0) return `${diffDay} дн. назад`
  if (diffHour > 0) return `${diffHour} ч. назад`
  if (diffMin > 0) return `${diffMin} мин. назад`
  return 'только что'
}

export function useSubscribers(channelId: Ref<string | number>) {
  const page = ref(1)
  const status = ref('all')
  const search = ref('')
  const searchDebounced = ref('')
  const source = ref('')

  let debounceTimer: ReturnType<typeof setTimeout>
  watch(search, (v) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchDebounced.value = v
      page.value = 1
    }, 300)
  })

  watch([status, source], () => {
    page.value = 1
  })

  const { data, status: fetchStatus, refresh } = useFetch<SubscribersResponse>(
    () => `/api/channels/${channelId.value}/subscribers`,
    {
      query: {
        page,
        limit: 50,
        status,
        search: searchDebounced,
        source,
      },
    },
  )

  const subscribers = computed(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const pages = computed(() => data.value?.pages ?? 1)
  const sources = computed(() => data.value?.sources ?? [])
  const loading = computed(() => fetchStatus.value === 'pending')

  return { subscribers, total, page, pages, sources, status, search, source, loading, refresh }
}
