export interface PublicReport {
  id: number
  channelId: number
  token: string
  name: string
  showSubscriberNames: boolean
  showUtmDetails: boolean
  showCosts: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  channel?: { id: number; title: string; username: string | null }
}

interface CreateReportData {
  channelId: number
  name: string
  password?: string
  showSubscriberNames?: boolean
  showUtmDetails?: boolean
  showCosts?: boolean
}

interface UpdateReportData {
  name?: string
  password?: string | null
  showSubscriberNames?: boolean
  showUtmDetails?: boolean
  showCosts?: boolean
  isActive?: boolean
}

export function useReports() {
  const reports = useState<PublicReport[]>('reports-list', () => [])
  const loading = useState<boolean>('reports-loading', () => false)
  const error = useState<string>('reports-error', () => '')

  async function fetchReports(channelId?: number): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const data = await $fetch<{ reports: PublicReport[] }>('/api/reports')
      reports.value = channelId !== undefined
        ? data.reports.filter(r => r.channelId === channelId)
        : data.reports
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось загрузить отчёты')
    } finally {
      loading.value = false
    }
  }

  async function createReport(data: CreateReportData): Promise<{ token: string; url: string }> {
    return await $fetch<{ token: string; url: string }>('/api/reports', {
      method: 'POST',
      body: data,
    })
  }

  async function updateReport(token: string, data: UpdateReportData): Promise<PublicReport> {
    return await $fetch<PublicReport>(`/api/reports/${token}`, {
      method: 'PATCH',
      body: data,
    })
  }

  async function deleteReport(token: string): Promise<void> {
    await $fetch(`/api/reports/${token}`, { method: 'DELETE' })
  }

  return { reports, loading, error, fetchReports, createReport, updateReport, deleteReport }
}

function extractMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
    if ('message' in err && typeof (err as { message: unknown }).message === 'string') {
      return (err as { message: string }).message
    }
  }
  return fallback
}
