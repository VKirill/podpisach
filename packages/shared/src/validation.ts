import { z } from 'zod'
import { MAX_UTM_LENGTH, MAX_URL_LENGTH, CURRENCIES } from './constants.js'

// UTM-поле (R8: ограничение длины для защиты от инъекций)
const utmField = z.string().max(MAX_UTM_LENGTH).optional()

// Данные трекинга от JS-скрипта
export const trackPayloadSchema = z.object({
  channelId: z.number().int().positive(),
  platform: z.enum(['telegram', 'max']).optional().default('telegram'),
  utmSource: utmField,
  utmMedium: utmField,
  utmCampaign: utmField,
  utmContent: utmField,
  utmTerm: utmField,
  yclid: z.string().max(200).optional(),
  gclid: z.string().max(200).optional(),
  referrer: z.string().max(MAX_URL_LENGTH).optional(),
  url: z.string().max(MAX_URL_LENGTH).optional(),
  fingerprint: z.string().max(500).optional(),
})

// Вход по паролю администратора
export const loginSchema = z.object({
  password: z.string().min(1).max(200),
})

// Создание пароля при первоначальной настройке
export const setupPasswordSchema = z.object({
  password: z.string().min(8).max(200),
})

// Подключение бота (Telegram или MAX)
export const setupBotSchema = z.object({
  platform: z.enum(['telegram', 'max']),
  token: z.string().min(10).max(500),
})

// Создание ручной invite-ссылки
export const createLinkSchema = z.object({
  channelId: z.number().int().positive(),
  name: z.string().min(1).max(200).optional(),
  utmSource: utmField,
  utmMedium: utmField,
  utmCampaign: utmField,
  utmContent: utmField,
  utmTerm: utmField,
  costAmount: z.number().positive().optional(),
  costCurrency: z.enum([...CURRENCIES] as [string, ...string[]]).optional(),
})

// Обновление системных настроек
export const settingsSchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  maxCorrelationWindowSec: z.number().int().min(10).max(300).optional(),
})

// Создание публичного отчёта для клиента
export const createReportSchema = z.object({
  channelId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  password: z.string().min(4).max(200).optional(),
  showSubscriberNames: z.boolean().optional().default(false),
  showUtmDetails: z.boolean().optional().default(true),
  showCosts: z.boolean().optional().default(true),
})
