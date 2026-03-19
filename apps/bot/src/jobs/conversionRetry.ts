import cron from 'node-cron'
import type { ScheduledTask } from 'node-cron'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'

const BATCH_LIMIT = 50
const MAX_RETRY_COUNT = 3
const RETENTION_HOURS = 24

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
        select: { id: true, retryCount: true, integrationId: true },
        take: BATCH_LIMIT,
      })

      if (conversions.length === 0) return

      logger.info({ count: conversions.length }, 'Retrying pending/failed conversions')

      for (const conversion of conversions) {
        try {
          // TODO: Replace with actual YM/GA send logic when INT-1/INT-2 are implemented
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
