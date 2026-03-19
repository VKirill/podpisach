// Re-export из @op/shared
export {
  PLATFORMS,
  DEFAULT_LINK_TTL_HOURS,
  DEFAULT_CORRELATION_WINDOW_SEC,
  DEFAULT_TIMEZONE,
  MAX_LINKS_PER_MINUTE,
  GOAL_KEYS,
  GOAL_DEFAULT_NAMES,
  CURRENCIES,
  CONFIDENCE,
  MAX_UTM_LENGTH,
  MAX_URL_LENGTH,
} from '@op/shared/constants'

// UI-специфичные константы навигации
export const NAV_ITEMS = [
  { label: 'Обзор', icon: 'i-heroicons-chart-bar', to: '/' },
  { label: 'Каналы', icon: 'i-heroicons-megaphone', to: '/channels' },
  { label: 'Источники', icon: 'i-heroicons-chart-pie', to: '/sources' },
  { label: 'Интеграции', icon: 'i-heroicons-link', to: '/integrations' },
  { label: 'JS-скрипт', icon: 'i-heroicons-code-bracket', to: '/script' },
  { label: 'Настройки', icon: 'i-heroicons-cog-6-tooth', to: '/settings' },
] as const

export const APP_VERSION = '0.1.0'
