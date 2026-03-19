import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma.js'
import { correlate } from '../../attribution/correlator.js'
import { logger } from '../../utils/logger.js'
import type { MaxUpdate } from '../types.js'

type ChannelRef = { id: number }

export async function handleMaxUpdate(update: MaxUpdate): Promise<void> {
  if (update.update_type === 'user_added') {
    await handleUserAdded(update)
  } else if (update.update_type === 'user_removed') {
    await handleUserRemoved(update)
  }
}

async function handleUserAdded(update: MaxUpdate): Promise<void> {
  const { user, chat_id, timestamp } = update

  const channel = await prisma.channel.findUnique({
    where: {
      platform_platformChatId: {
        platform: 'max',
        platformChatId: String(chat_id),
      },
    },
    select: { id: true },
  })

  if (!channel) {
    logger.warn({ chatId: chat_id }, 'MAX channel not found in DB')
    return
  }

  const joinTimestamp = new Date(timestamp * 1000)
  const attribution = await correlate('max', channel.id, String(user.user_id), undefined, joinTimestamp)

  const rawData = update as unknown as Prisma.InputJsonValue

  let subscriber: { id: number }
  try {
    subscriber = await prisma.subscriber.upsert({
      where: {
        channelId_platform_platformUserId: {
          channelId: channel.id,
          platform: 'max',
          platformUserId: String(user.user_id),
        },
      },
      create: {
        channelId: channel.id,
        platform: 'max',
        platformUserId: String(user.user_id),
        firstName: user.name || null,
        lastName: null, // MAX не разделяет имя на части
        username: user.username ?? null,
        visitId: attribution.visitId,
        attributionConfidence: attribution.confidence,
        status: 'active',
        subscribedAt: new Date(),
      },
      update: {
        status: 'active',
        firstName: user.name || null,
        username: user.username ?? null,
        subscribedAt: new Date(),
        leftAt: null,
      },
      select: { id: true },
    })
  } catch (err: unknown) {
    // visitId @unique constraint violated — другой подписчик уже занял этот visitId
    if (isPrismaUniqueError(err) && attribution.visitId !== null) {
      logger.warn(
        { userId: user.user_id, channelId: channel.id, visitId: attribution.visitId },
        'visitId already claimed by another subscriber, retrying without visitId',
      )
      subscriber = await prisma.subscriber.upsert({
        where: {
          channelId_platform_platformUserId: {
            channelId: channel.id,
            platform: 'max',
            platformUserId: String(user.user_id),
          },
        },
        create: {
          channelId: channel.id,
          platform: 'max',
          platformUserId: String(user.user_id),
          firstName: user.name || null,
          lastName: null,
          username: user.username ?? null,
          visitId: null,
          attributionConfidence: attribution.confidence,
          status: 'active',
          subscribedAt: new Date(),
        },
        update: {
          status: 'active',
          firstName: user.name || null,
          username: user.username ?? null,
          subscribedAt: new Date(),
          leftAt: null,
        },
        select: { id: true },
      })
    } else {
      throw err
    }
  }

  await prisma.subscriptionEvent.create({
    data: { subscriberId: subscriber.id, eventType: 'joined', rawData },
  })

  await prisma.channel.update({
    where: { id: channel.id },
    data: { subscriberCount: { increment: 1 } },
  })

  logger.info(
    {
      userId: user.user_id,
      channelId: channel.id,
      method: attribution.method,
      confidence: attribution.confidence,
    },
    '✅ MAX subscriber joined (correlation)',
  )
}

async function handleUserRemoved(update: MaxUpdate): Promise<void> {
  const { user, chat_id } = update

  const channel = await prisma.channel.findUnique({
    where: {
      platform_platformChatId: {
        platform: 'max',
        platformChatId: String(chat_id),
      },
    },
    select: { id: true },
  })

  if (!channel) {
    logger.warn({ chatId: chat_id }, 'MAX channel not found in DB')
    return
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: {
      channelId_platform_platformUserId: {
        channelId: channel.id,
        platform: 'max',
        platformUserId: String(user.user_id),
      },
    },
    select: { id: true },
  })

  if (!subscriber) {
    logger.warn({ userId: user.user_id, channelId: channel.id }, 'Subscriber not found on MAX leave event')
    return
  }

  const rawData = update as unknown as Prisma.InputJsonValue

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { status: 'left', leftAt: new Date() },
  })

  await prisma.subscriptionEvent.create({
    data: { subscriberId: subscriber.id, eventType: 'left', rawData },
  })

  // Безопасный декремент: не уйти в минус
  await prisma.channel.updateMany({
    where: { id: channel.id, subscriberCount: { gt: 0 } },
    data: { subscriberCount: { decrement: 1 } },
  })

  logger.info({ userId: user.user_id, channelId: channel.id }, '👋 MAX subscriber left')
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
