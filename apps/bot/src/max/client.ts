import { ofetch } from 'ofetch'
import { logger } from '../utils/logger.js'
import type { MaxBotInfo, MaxGetUpdatesResponse } from './types.js'

const MAX_API_BASE = 'https://botapi.max.ru'

export class MaxApiClient {
  private readonly token: string
  private readonly baseUrl: string

  constructor(token: string) {
    this.token = token
    this.baseUrl = MAX_API_BASE
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    try {
      return await ofetch<T>(`${this.baseUrl}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}` },
        body: body !== undefined ? body : undefined,
      })
    } catch (err) {
      logger.error({ err, method, endpoint }, 'MAX API request failed')
      throw err
    }
  }

  async getMe(): Promise<MaxBotInfo> {
    return this.request<MaxBotInfo>('GET', '/me')
  }

  async getUpdates(marker?: string, timeout = 30): Promise<MaxGetUpdatesResponse> {
    const params = new URLSearchParams({ timeout: String(timeout) })
    if (marker) params.set('marker', marker)
    return this.request<MaxGetUpdatesResponse>('GET', `/updates?${params.toString()}`)
  }

  async getChatInfo(chatId: string): Promise<unknown> {
    return this.request<unknown>('GET', `/chats/${chatId}`)
  }

  async getChatMembers(chatId: string): Promise<unknown> {
    return this.request<unknown>('GET', `/chats/${chatId}/members`)
  }
}
