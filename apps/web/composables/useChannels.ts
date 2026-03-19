import type { Platform } from '@ps/shared'

interface ChannelBot {
  id: number
  platform: Platform
  botUsername: string | null
  botName: string | null
}

interface ChannelCount {
  subscribers: number
  inviteLinks: number
}

export interface Channel {
  id: number
  title: string
  username: string | null
  platform: Platform
  platformChatId: string
  isPrivate: boolean
  isActive: boolean
  subscriberCount: number
  linkTtlHours: number
  bot: ChannelBot
  _count: ChannelCount
  createdAt: string
  updatedAt: string
}

export function useChannels() {
  const channels = useState<Channel[]>('channels-list', () => [])
  const loading = useState<boolean>('channels-loading', () => false)
  const error = useState<string>('channels-error', () => '')

  async function fetchChannels(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const data = await $fetch<{ channels: Channel[] }>('/api/channels')
      channels.value = data.channels
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Не удалось загрузить каналы')
    } finally {
      loading.value = false
    }
  }

  async function addChannel(channelId: string, botId: number): Promise<Channel> {
    return await $fetch<Channel>('/api/channels', {
      method: 'POST',
      body: { channelId, botId },
    })
  }

  async function deleteChannel(id: number): Promise<void> {
    await $fetch(`/api/channels/${id}`, { method: 'DELETE' })
    await fetchChannels()
  }

  return { channels, loading, error, fetchChannels, addChannel, deleteChannel }
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
