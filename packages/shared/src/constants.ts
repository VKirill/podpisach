// Платформы
export const PLATFORMS = ['telegram', 'max'] as const

// Дефолтные значения
export const DEFAULT_LINK_TTL_HOURS = 24
export const DEFAULT_CORRELATION_WINDOW_SEC = 60
export const DEFAULT_TIMEZONE = 'Europe/Moscow'

// Rate limits (на канал)
export const MAX_LINKS_PER_MINUTE = 20

// Зарезервированные ключи целей Яндекс Метрики
export const GOAL_KEYS = [
  'op_visit',
  'op_click',
  'op_subscribe',
  'op_unsubscribe',
  'op_resubscribe',
] as const

// Названия целей по умолчанию
export const GOAL_DEFAULT_NAMES: Record<string, string> = {
  op_visit: 'ОП: Посещение лендинга',
  op_click: 'ОП: Клик по подписке',
  op_subscribe: 'ОП: Подписка',
  op_unsubscribe: 'ОП: Отписка',
  op_resubscribe: 'ОП: Повторная подписка',
}

// Валюты для затрат
export const CURRENCIES = ['RUB', 'EUR', 'USD', 'TON'] as const
export type Currency = typeof CURRENCIES[number]

// Уровни уверенности атрибуции
export const CONFIDENCE = {
  EXACT_TG: 1.0,    // Telegram: точное совпадение invite_link
  HIGH_TG: 0.95,    // Telegram: приватный канал
  MEDIUM_MAX: 0.80, // MAX: корреляция по fingerprint/IP + временное окно
  LOW_MAX: 0.70,    // MAX: fallback-корреляция
} as const

// Ограничения UTM-полей (R8: защита от SQL-инъекций)
export const MAX_UTM_LENGTH = 500
export const MAX_URL_LENGTH = 2048
