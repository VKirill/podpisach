interface Settings {
  timezone: string
  maxCorrelationWindowSec: number
}

interface BotChannel {
  id: number
  title: string
}

export interface SettingsBot {
  id: number
  platform: string
  botUsername: string | null
  botName: string | null
  isActive: boolean
  channels: BotChannel[]
  createdAt: string
}

export interface SystemInfo {
  version: string
  channels: number
  subscribers: number
  links: number
  dbSize: number
}

export function useSettings() {
  const settings = useState<Settings>('settings-data', () => ({
    timezone: 'Europe/Moscow',
    maxCorrelationWindowSec: 60,
  }))
  const bots = useState<SettingsBot[]>('settings-bots', () => [])
  const systemInfo = useState<SystemInfo | null>('settings-system-info', () => null)
  const loading = useState<boolean>('settings-loading', () => false)
  const error = useState<string>('settings-error', () => '')

  async function loadSettings(): Promise<void> {
    try {
      const data = await $fetch<Settings>('/api/settings')
      settings.value = data
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось загрузить настройки')
    }
  }

  async function saveSettings(patch: Partial<Settings>): Promise<boolean> {
    try {
      const data = await $fetch<Settings>('/api/settings', { method: 'PATCH', body: patch })
      settings.value = data
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось сохранить настройки')
      return false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      await $fetch('/api/settings/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      })
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось сменить пароль')
      return false
    } finally {
      loading.value = false
    }
  }

  async function loadBots(): Promise<void> {
    try {
      const data = await $fetch<{ bots: SettingsBot[] }>('/api/bots')
      bots.value = data.bots
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось загрузить список ботов')
    }
  }

  async function deactivateBot(id: number): Promise<boolean> {
    try {
      const data = await $fetch<{ bot: SettingsBot }>(`/api/bots/${id}`, { method: 'PATCH' })
      const idx = bots.value.findIndex((b) => b.id === id)
      if (idx !== -1) bots.value[idx] = { ...bots.value[idx]!, ...data.bot }
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось отключить бота')
      return false
    }
  }

  async function loadSystemInfo(): Promise<void> {
    try {
      systemInfo.value = await $fetch<SystemInfo>('/api/system/info')
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось загрузить информацию о системе')
    }
  }

  return {
    settings,
    bots,
    systemInfo,
    loading,
    error,
    loadSettings,
    saveSettings,
    changePassword,
    loadBots,
    deactivateBot,
    loadSystemInfo,
  }
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
