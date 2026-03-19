import { ofetch } from 'ofetch'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect'

interface GaConfig {
  measurementId: string
  apiSecret: string
}

/**
 * Отправляет конверсию в Google Analytics через Measurement Protocol v2.
 * client_id = visit.sessionId (UUID). GA MP v2 всегда возвращает 204 — ошибка только сетевая.
 * Fire-and-forget: ошибки логируются, не пробрасываются.
 */
export async function sendGaConversion(subscriberId: number, eventName: string): Promise<void> {
  const integration = await prisma.integration.findUnique({
    where: { type: 'google_analytics' },
    select: { id: true, isActive: true, config: true },
  })

  if (!integration?.isActive) return

  const { measurementId, apiSecret } = integration.config as GaConfig

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: {
      id: true,
      channelId: true,
      visit: {
        select: {
          id: true,
          sessionId: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      },
    },
  })

  if (!subscriber?.visit) {
    logger.debug({ subscriberId, eventName }, 'No visit for subscriber — skipping GA conversion')
    return
  }

  const { visit } = subscriber

  try {
    await ofetch(`${GA_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      body: {
        client_id: visit.sessionId,
        events: [
          {
            name: `op_${eventName}`,
            params: {
              channel_id: String(subscriber.channelId),
              utm_source: visit.utmSource ?? '',
              utm_medium: visit.utmMedium ?? '',
              utm_campaign: visit.utmCampaign ?? '',
              engagement_time_msec: 1,
            },
          },
        ],
      },
    })

    await prisma.conversion.create({
      data: {
        visitId: visit.id,
        subscriberId: subscriber.id,
        integrationId: integration.id,
        status: 'sent',
        sentAt: new Date(),
      },
    })

    logger.info({ subscriberId, eventName }, '✅ GA conversion sent')
  } catch (err) {
    await prisma.conversion.create({
      data: {
        visitId: visit.id,
        subscriberId: subscriber.id,
        integrationId: integration.id,
        status: 'failed',
        errorMessage: String(err),
      },
    })
    logger.error({ err, subscriberId, eventName }, 'Failed to send GA conversion')
  }
}

/**
 * Повторная отправка конверсии GA для retry-джоба.
 * Читает Integration.config и отправляет напрямую в GA MP v2.
 */
export async function retryGaConversion(
  subscriberId: number,
  visitSessionId: string,
  channelId: number,
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  measurementId: string,
  apiSecret: string,
): Promise<void> {
  await ofetch(`${GA_ENDPOINT}?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
    method: 'POST',
    body: {
      client_id: visitSessionId,
      events: [
        {
          name: 'op_subscribe',
          params: {
            channel_id: String(channelId),
            utm_source: utmSource ?? '',
            utm_medium: utmMedium ?? '',
            utm_campaign: utmCampaign ?? '',
            engagement_time_msec: 1,
          },
        },
      ],
    },
  })
}
