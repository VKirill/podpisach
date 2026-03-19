import cron from 'node-cron'
import type { ScheduledTask } from 'node-cron'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'
import { GOAL_KEYS } from '@op/shared'

type GoalKey = typeof GOAL_KEYS[number]

const BATCH_LIMIT = 50
const MAX_RETRY_COUNT = 3
const RETENTION_HOURS = 24
const APP_INTERNAL_URL = process.env['APP_INTERNAL_URL'] ?? 'http://app:3000'

interface ConversionWithRelations {
  id: number
  retryCount: number
  subscriberId: number
  integration: { type: string }
  visit: { yclid: string | null } | null
  subscriber: { channelId: number }
}

async function retryYmConversion(
  conversion: ConversionWithRelations,
  internalApiSecret: string,
): Promise<void> {
  // Для YM нужен goalKey — берём из channelGoalConfig по каналу подписчика
  const channelCounter = await prisma.channelCounter.findFirst({
    where: { channelId: conversion.subscriber.channelId },
    include: {
      goals: {
        where: { isEnabled: true },
        select: { goalKey: true },
      },
    },
  })

  if (!channelCounter || channelCounter.goals.length === 0) return

  // Отправляем первую подходящую серверную цель
  const serverGoals: GoalKey[] = ['op_subscribe', 'op_unsubscribe', 'op_resubscribe']
  const enabledGoal = channelCounter.goals.find((g: { goalKey: string }) =>
    serverGoals.includes(g.goalKey as GoalKey),
  )
  if (!enabledGoal) return

  const response = await fetch(`${APP_INTERNAL_URL}/api/internal/conversion/ym`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${internalApiSecret}`,
    },
    body: JSON.stringify({
      subscriberId: conversion.subscriberId,
      goalKey: enabledGoal.goalKey,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`YM API error ${response.status}: ${text}`)
  }
}

export function startConversionRetryJob(): ScheduledTask {
  const task = cron.schedule('*/10 * * * *', async () => {
    try {
      const since = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000)

      const conversions = await prisma.conversion.findMany({
        where: {
          status: { in: ['pending', 'failed'] },
          retryCount: { lt: MAX_RETRY_COUNT },
          createdAt: { gte: since },
        },
        select: {
          id: true,
          retryCount: true,
          subscriberId: true,
          integration: { select: { type: true } },
          visit: { select: { yclid: true } },
          subscriber: { select: { channelId: true } },
        },
        take: BATCH_LIMIT,
      })

      if (conversions.length === 0) return

      logger.info({ count: conversions.length }, 'Retrying pending/failed conversions')

      const settings = await prisma.settings.findFirst({ where: { id: 1 } })
      if (!settings) {
        logger.warn('Settings not found — skipping conversion retry')
        return
      }

      for (const conversion of conversions) {
        try {
          if (conversion.integration.type === 'yandex_metrika') {
            await retryYmConversion(conversion, settings.internalApiSecret)
          }
          // GA и другие интеграции — будут добавлены в INT-2

          await prisma.conversion.update({
            where: { id: conversion.id },
            data: {
              retryCount: conversion.retryCount + 1,
              status: 'sent',
              sentAt: new Date(),
            },
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          await prisma.conversion.update({
            where: { id: conversion.id },
            data: {
              retryCount: conversion.retryCount + 1,
              status: 'failed',
              errorMessage: message,
            },
          })
          logger.warn({ conversionId: conversion.id, err }, 'Conversion retry failed')
        }
      }
    } catch (err) {
      logger.error({ err }, 'Conversion retry job error')
    }
  })

  logger.info('🔄 Conversion retry job scheduled (every 10 min)')
  return task
}
