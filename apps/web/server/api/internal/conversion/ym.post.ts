import { z } from 'zod'
import { ensureValidToken, sendOfflineConversion } from '~/server/utils/ymClient'

const conversionYmSchema = z.object({
  subscriberId: z.number().int().positive(),
  goalKey: z.enum(['op_subscribe', 'op_unsubscribe', 'op_resubscribe']),
})

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, conversionYmSchema)
  const { subscriberId, goalKey } = body

  // Получаем subscriber с visit и channelCounter
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    include: {
      visit: { select: { id: true, yclid: true } },
    },
  })

  if (!subscriber) {
    throw createError({ statusCode: 404, message: 'Subscriber not found' })
  }

  const yclid = subscriber.visit?.yclid
  const visitId = subscriber.visit?.id

  if (!yclid || !visitId) {
    throw createError({ statusCode: 422, message: 'No yclid for this subscriber' })
  }

  // Находим channelCounter с целью для данного канала
  const channelCounter = await prisma.channelCounter.findFirst({
    where: { channelId: subscriber.channelId },
    include: {
      counter: { select: { yandexCounterId: true, accountId: true } },
      goals: {
        where: { goalKey, isEnabled: true },
        select: { goalKey: true, isEnabled: true, yandexGoalId: true },
      },
    },
  })

  if (!channelCounter || channelCounter.goals.length === 0) {
    throw createError({ statusCode: 422, message: 'No enabled YM goal config for this channel' })
  }

  // Получаем YM аккаунт и токен
  const account = await prisma.yandexMetrikaAccount.findFirst({
    where: { id: channelCounter.counter.accountId },
  })

  if (!account || !account.isConnected) {
    throw createError({ statusCode: 422, message: 'Yandex Metrika account not connected' })
  }

  // Находим Integration для хранения Conversion
  const integration = await prisma.integration.findFirst({
    where: { type: 'yandex_metrika', isActive: true },
  })

  if (!integration) {
    throw createError({ statusCode: 422, message: 'Yandex Metrika integration not configured' })
  }

  const datetime = new Date().toISOString().replace('T', ' ').substring(0, 19)
  let conversionStatus: 'sent' | 'failed' = 'sent'
  let errorMessage: string | undefined

  try {
    const token = await ensureValidToken(account)
    await sendOfflineConversion(
      channelCounter.counter.yandexCounterId,
      yclid,
      goalKey,
      datetime,
      token,
    )
  } catch (err) {
    conversionStatus = 'failed'
    errorMessage = err instanceof Error ? err.message : String(err)
  }

  const conversion = await prisma.conversion.create({
    data: {
      visitId,
      subscriberId,
      integrationId: integration.id,
      status: conversionStatus,
      errorMessage: errorMessage ?? null,
      sentAt: conversionStatus === 'sent' ? new Date() : null,
    },
  })

  return { success: true, conversion: { id: conversion.id, status: conversion.status } }
})
