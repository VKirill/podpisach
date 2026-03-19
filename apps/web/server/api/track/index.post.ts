import { trackPayloadSchema } from '@op/shared/validation'
import crypto from 'node:crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, CORS_HEADERS)

  const body = await validateBody(event, trackPayloadSchema)

  // Хешируем IP — не хранить raw (нужен только для корреляции MAX)
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex')

  // Проверяем что канал существует и активен
  const channel = await prisma.channel.findUnique({
    where: { id: body.channelId },
    select: { id: true, isActive: true },
  })

  if (!channel || !channel.isActive) {
    throw createError({ statusCode: 404, message: 'Channel not found or inactive' })
  }

  // Создаём запись визита в БД
  const visit = await prisma.visit.create({
    data: {
      channelId: body.channelId,
      platform: body.platform ?? 'telegram',
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
      utmContent: body.utmContent,
      utmTerm: body.utmTerm,
      yclid: body.yclid,
      gclid: body.gclid,
      referrer: body.referrer,
      pageUrl: body.url,
      fingerprint: body.fingerprint,
      ipHash,
    },
    select: { id: true, sessionId: true },
  })

  let inviteUrl: string | undefined
  let ymCounterId: string | undefined

  // Для Telegram-платформы запрашиваем invite-ссылку у бота
  if (body.platform !== 'max') {
    const config = useRuntimeConfig()
    try {
      const settings = await prisma.settings.findFirst({
        where: { id: 1 },
        select: { internalApiSecret: true },
      })

      const response = await $fetch<{ inviteUrl: string; linkId: number }>(
        `${config.botInternalUrl}/internal/link/create`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${settings?.internalApiSecret}` },
          body: { channelId: body.channelId, visitId: visit.id },
        },
      )
      inviteUrl = response.inviteUrl
    } catch {
      // Бот недоступен или rate limit — возвращаем ответ без ссылки (graceful)
      console.warn('[track] Bot unavailable, returning without invite_url')
    }
  }

  // Получаем ID счётчика Яндекс Метрики для данного канала (если привязан)
  const channelCounter = await prisma.channelCounter.findFirst({
    where: { channelId: body.channelId },
    select: { counter: { select: { yandexCounterId: true } } },
  })

  if (channelCounter) {
    ymCounterId = channelCounter.counter.yandexCounterId
  }

  return {
    sessionId: visit.sessionId,
    invite_url: inviteUrl,
    ym_counter_id: ymCounterId,
  }
})
