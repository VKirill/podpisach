import type { Bot } from 'grammy'
import type { ChatInviteLink, User } from 'grammy/types'
import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma.js'
import { logger } from '../../utils/logger.js'
import { revokeInviteLink } from '../services/linkService.js'
import { correlate } from '../../attribution/correlator.js'
import { sendGaConversion } from '../../integrations/googleAnalytics.js'

type ChannelRef = { id: number }
type LeaveStatus = 'left' | 'kicked' | 'banned'

export function setupMemberUpdateHandler(bot: Bot): void {
  bot.on('chat_member', async (ctx) => {
    try {
      const update = ctx.chatMember
      const { chat, new_chat_member: newMember, old_chat_member: oldMember } = update

      const channel = await prisma.channel.findUnique({
        where: {
          platform_platformChatId: {
            platform: 'telegram',
            platformChatId: String(chat.id),
          },
        },
      })

      if (!channel) {
        logger.warn({ chatId: chat.id }, 'Channel not found in DB')
        return
      }

      const oldStatus = oldMember.status
      const newStatus = newMember.status
      const rawData = ctx.update as unknown as Prisma.InputJsonValue

      if (isJoin(oldStatus, newStatus)) {
        await handleJoin(bot, channel, newMember.user, update.invite_link, rawData)
      } else if (isLeave(oldStatus, newStatus)) {
        await handleLeave(channel, newMember.user, newStatus as LeaveStatus, rawData)
      }
    } catch (err) {
      logger.error(err, 'Error handling chat_member update')
    }
  })
}

function isJoin(oldStatus: string, newStatus: string): boolean {
  return (
    ['left', 'kicked'].includes(oldStatus) &&
    ['member', 'administrator'].includes(newStatus)
  )
}

function isLeave(oldStatus: string, newStatus: string): boolean {
  return (
    ['member', 'administrator', 'creator'].includes(oldStatus) &&
    ['left', 'kicked', 'banned'].includes(newStatus)
  )
}

async function handleJoin(
  bot: Bot,
  channel: ChannelRef,
  user: User,
  inviteLinkData: ChatInviteLink | undefined,
  rawData: Prisma.InputJsonValue,
): Promise<void> {
  const attribution = await correlate('telegram', channel.id, String(user.id), inviteLinkData?.invite_link)

  let subscriber: { id: number }
  try {
    subscriber = await prisma.subscriber.upsert({
      where: {
        channelId_platform_platformUserId: {
          channelId: channel.id,
          platform: 'telegram',
          platformUserId: String(user.id),
        },
      },
      create: {
        channelId: channel.id,
        platform: 'telegram',
        platformUserId: String(user.id),
        firstName: user.first_name,
        lastName: user.last_name ?? null,
        username: user.username ?? null,
        inviteLinkId: attribution.inviteLinkId,
        visitId: attribution.visitId,
        attributionConfidence: attribution.confidence,
        status: 'active',
        subscribedAt: new Date(),
      },
      update: {
        status: 'active',
        firstName: user.first_name,
        lastName: user.last_name ?? null,
        username: user.username ?? null,
        subscribedAt: new Date(),
        leftAt: null,
      },
    })
  } catch (err: unknown) {
    // visitId @unique constraint violated — another subscriber already has this visitId
    if (isPrismaUniqueError(err) && attribution.visitId !== null) {
      logger.warn(
        { userId: user.id, channelId: channel.id, visitId: attribution.visitId },
        'visitId already claimed by another subscriber, retrying without visitId',
      )
      subscriber = await prisma.subscriber.upsert({
        where: {
          channelId_platform_platformUserId: {
            channelId: channel.id,
            platform: 'telegram',
            platformUserId: String(user.id),
          },
        },
        create: {
          channelId: channel.id,
          platform: 'telegram',
          platformUserId: String(user.id),
          firstName: user.first_name,
          lastName: user.last_name ?? null,
          username: user.username ?? null,
          inviteLinkId: attribution.inviteLinkId,
          visitId: null,
          attributionConfidence: attribution.confidence,
          status: 'active',
          subscribedAt: new Date(),
        },
        update: {
          status: 'active',
          firstName: user.first_name,
          lastName: user.last_name ?? null,
          username: user.username ?? null,
          subscribedAt: new Date(),
          leftAt: null,
        },
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

  if (attribution.inviteLinkId !== null) {
    await prisma.inviteLink.update({
      where: { id: attribution.inviteLinkId },
      data: { joinCount: { increment: 1 } },
    })

    // Auto-revoke after joinCount increment (R1: critical for TG API limits)
    const inviteLink = await prisma.inviteLink.findUnique({
      where: { id: attribution.inviteLinkId },
      select: { type: true },
    })

    if (inviteLink?.type === 'auto') {
      await revokeInviteLink(bot, attribution.inviteLinkId)
    }
  }

  logger.info(
    {
      userId: user.id,
      channelId: channel.id,
      method: attribution.method,
      confidence: attribution.confidence,
    },
    '✅ New subscriber joined',
  )

  sendGaConversion(subscriber.id, 'subscribe').catch((err) => {
    logger.error({ err, subscriberId: subscriber.id }, 'GA conversion error on join')
  })
}

async function handleLeave(
  channel: ChannelRef,
  user: User,
  newStatus: LeaveStatus,
  rawData: Prisma.InputJsonValue,
): Promise<void> {
  const subscriber = await prisma.subscriber.findUnique({
    where: {
      channelId_platform_platformUserId: {
        channelId: channel.id,
        platform: 'telegram',
        platformUserId: String(user.id),
      },
    },
  })

  if (!subscriber) {
    logger.warn({ userId: user.id, channelId: channel.id }, 'Subscriber not found on leave event')
    return
  }

  const status = mapLeaveStatus(newStatus)

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { status, leftAt: new Date() },
  })

  await prisma.subscriptionEvent.create({
    data: { subscriberId: subscriber.id, eventType: status, rawData },
  })

  // Safe decrement: skip if already 0 to avoid negative values
  await prisma.channel.updateMany({
    where: { id: channel.id, subscriberCount: { gt: 0 } },
    data: { subscriberCount: { decrement: 1 } },
  })

  logger.info(
    { userId: user.id, channelId: channel.id, status },
    '👋 Subscriber left',
  )

  sendGaConversion(subscriber.id, 'unsubscribe').catch((err) => {
    logger.error({ err, subscriberId: subscriber.id }, 'GA conversion error on leave')
  })
}

function mapLeaveStatus(newStatus: LeaveStatus): 'left' | 'kicked' | 'banned' {
  if (newStatus === 'left') return 'left'
  if (newStatus === 'kicked') return 'kicked'
  return 'banned'
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  )
}
