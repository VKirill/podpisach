interface SetupStatus {
  setupCompleted: boolean
  hasPassword: boolean
  hasTelegramBot: boolean
  hasChannel: boolean
  botUsername: string | null
  channelTitle: string | null
}

export function useSetup() {
  const currentStep = useState<number>('setup-step', () => 1)
  const totalSteps = 4
  const loading = useState<boolean>('setup-loading', () => false)
  const error = useState<string>('setup-error', () => '')
  const botUsername = useState<string>('setup-bot-username', () => '')
  const channelTitle = useState<string>('setup-channel-title', () => '')

  async function checkStatus(): Promise<SetupStatus> {
    const status = await $fetch<SetupStatus>('/api/setup/status')
    if (status.botUsername) botUsername.value = status.botUsername
    if (status.channelTitle) channelTitle.value = status.channelTitle
    if (status.hasPassword && status.hasTelegramBot && status.hasChannel) {
      currentStep.value = 4
    } else if (status.hasPassword && status.hasTelegramBot) {
      currentStep.value = 3
    } else if (status.hasPassword) {
      currentStep.value = 2
    } else {
      currentStep.value = 1
    }
    return status
  }

  async function setPassword(password: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      await $fetch('/api/setup/password', { method: 'POST', body: { password } })
      currentStep.value = 2
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось установить пароль')
      return false
    } finally {
      loading.value = false
    }
  }

  async function connectBot(token: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      const result = await $fetch<{ success: boolean; botUsername: string | null }>(
        '/api/setup/bot',
        { method: 'POST', body: { platform: 'telegram', token } },
      )
      if (result.botUsername) botUsername.value = result.botUsername
      currentStep.value = 3
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось подключить бота')
      return false
    } finally {
      loading.value = false
    }
  }

  async function addChannel(channelId: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      const result = await $fetch<{ success: boolean; channelTitle: string }>(
        '/api/setup/channel',
        { method: 'POST', body: { channelId } },
      )
      if (result.channelTitle) channelTitle.value = result.channelTitle
      currentStep.value = 4
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось добавить канал')
      return false
    } finally {
      loading.value = false
    }
  }

  async function completeSetup(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      await $fetch('/api/setup/complete', { method: 'POST' })
      await navigateTo('/')
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось завершить настройку')
    } finally {
      loading.value = false
    }
  }

  return {
    currentStep,
    totalSteps,
    loading,
    error,
    botUsername,
    channelTitle,
    checkStatus,
    setPassword,
    connectBot,
    addChannel,
    completeSetup,
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
