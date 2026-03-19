// Платформы
export type Platform = 'telegram' | 'max'

// Статусы подписчика
export type SubscriberStatus = 'active' | 'left' | 'kicked' | 'banned'

// Типы событий
export type EventType = 'joined' | 'left' | 'kicked' | 'banned'

// Типы ссылок
export type LinkType = 'auto' | 'manual'

// Статусы конверсий
export type ConversionStatus = 'pending' | 'sent' | 'failed'

// Типы интеграций
export type IntegrationType = 'yandex_metrika' | 'google_analytics'

// Системные цели (GoalKey)
export type GoalKey = 'op_visit' | 'op_click' | 'op_subscribe' | 'op_unsubscribe' | 'op_resubscribe'

// UTM-данные
export interface UtmData {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
}

// Данные трекинга (от JS-скрипта на лендинге)
export interface TrackPayload {
  channelId: number
  platform?: Platform
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  yclid?: string
  gclid?: string
  referrer?: string
  url?: string
  fingerprint?: string
}

// Ответ трекинг-эндпоинта
export interface TrackResponse {
  sessionId: string
  invite_url?: string
  max_channel_url?: string
}

// Запрос создания invite-ссылки (app → bot internal API)
export interface CreateLinkRequest {
  channelId: number
  visitId: number
}

// Ответ создания invite-ссылки
export interface CreateLinkResponse {
  inviteUrl: string
  linkId: number
}

// Статус бота (internal API)
export interface BotStatusResponse {
  status: 'running' | 'waiting' | 'error'
  telegramConnected: boolean
  maxConnected: boolean
  channels: number
}

// Сводная статистика для дашборда
export interface StatsOverview {
  totalSubscribers: number
  newToday: number
  leftToday: number
  channels: number
  topSources: Array<{ source: string; count: number }>
}
