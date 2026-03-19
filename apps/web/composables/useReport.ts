export interface ReportSource {
  source: string | null
  medium: string | null
  subscribers: number
  conversionPct: number
  totalCost?: number
  costCurrency?: string
  costPerSubscriber?: number
}

export interface ReportSubscriber {
  name: string | null
  subscribedAt: string
  source: string | null
  confidence: number
}

export interface ReportData {
  report: {
    name: string
    channelTitle: string
  }
  stats: {
    totalSubscribers: number
    newThisWeek: number
    leftThisWeek: number
  }
  chart: {
    labels: string[]
    joins: number[]
    leaves: number[]
  }
  sources: ReportSource[]
  subscribers?: ReportSubscriber[]
}

type ReportResponse =
  | ReportData
  | { needsPassword: true; report: { name: string } }

function extractMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message
    }
  }
  return 'Произошла ошибка'
}

export function useReport(token: string) {
  const data = ref<ReportData | null>(null)
  const needsPassword = ref(false)
  const reportName = ref('')
  const loading = ref(true)
  const error = ref('')

  async function fetchReport(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const result = await $fetch<ReportResponse>(`/api/reports/${token}`)
      if ('needsPassword' in result && result.needsPassword) {
        needsPassword.value = true
        reportName.value = result.report?.name ?? ''
      } else {
        data.value = result as ReportData
        needsPassword.value = false
      }
    } catch (err: unknown) {
      error.value = extractMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function authenticate(password: string): Promise<void> {
    await $fetch(`/api/reports/${token}/auth`, {
      method: 'POST',
      body: { password },
    })
    await fetchReport()
  }

  fetchReport()

  return { data, needsPassword, reportName, loading, error, authenticate }
}
