import { GOAL_KEYS } from '@ps/shared'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'

const APP_INTERNAL_URL = process.env['APP_INTERNAL_URL'] ?? 'http://app:3000'

type GoalKey = typeof GOAL_KEYS[number]

// Только серверные цели отправляются через Offline Conversions
const SERVER_SIDE_GOALS: Set<GoalKey> = new Set([
  'op_subscribe',
  'op_unsubscribe',
  'op_resubscribe',
])

interface ConversionPayload {
  subscriberId: number
  goalKey: GoalKey
}

/**
 * Отправляет конверсию в Яндекс Метрику через app internal API.
 * Вызывается при событиях подписки/отписки из Telegram/MAX.
 */
export async function sendYmConversion(subscriberId: number, goalKey: GoalKey): Promise<void> {
  if (!SERVER_SIDE_GOALS.has(goalKey)) return

  // Получаем subscriber с visit для проверки yclid
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    include: { visit: { select: { yclid: true } } },
  })

  if (!subscriber?.visit?.yclid) {
    logger.debug({ subscriberId, goalKey }, 'No yclid for subscriber — skipping YM conversion')
    return
  }

  // Находим channelCounter с нужной целью
  const channelCounter = await prisma.channelCounter.findFirst({
    where: { channelId: subscriber.channelId },
    include: {
      goals: {
        where: { goalKey, isEnabled: true },
      },
    },
  })

  if (!channelCounter || channelCounter.goals.length === 0) {
    logger.debug({ subscriberId, goalKey }, 'No enabled YM goal config — skipping conversion')
    return
  }

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) return

  const payload: ConversionPayload = { subscriberId, goalKey }

  try {
    const response = await fetch(`${APP_INTERNAL_URL}/api/internal/conversion/ym`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.internalApiSecret}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      logger.warn({ subscriberId, goalKey, status: response.status, text }, 'YM conversion API error')
    } else {
      logger.info({ subscriberId, goalKey }, 'YM conversion sent successfully')
    }
  } catch (err) {
    logger.error({ err, subscriberId, goalKey }, 'Failed to send YM conversion')
  }
}
