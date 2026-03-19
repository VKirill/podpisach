import { GrammyError } from 'grammy'
import type { Bot } from 'grammy'
import { MAX_LINKS_PER_MINUTE } from '@op/shared'
import { prisma } from '../../utils/prisma.js'
import { logger } from '../../utils/logger.js'
import { withRetry } from '../../utils/retry.js'

// Rate limiter: channelId → timestamps of link creations in last 60s
const rateLimitMap = new Map<number, number[]>()

function checkRateLimit(channelId: number): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(channelId) ?? []
  const recent = timestamps.filter((t) => now - t < 60_000)
  rateLimitMap.set(channelId, recent)
  return recent.length < MAX_LINKS_PER_MINUTE
}

function recordRateLimitUse(channelId: number): void {
  const timestamps = rateLimitMap.get(channelId) ?? []
  timestamps.push(Date.now())
  rateLimitMap.set(channelId, timestamps)
}

export async function createInviteLink(
  bot: Bot,
  channelId: number,
  visitId: number,
): Promise<{ url: string; linkId: number } | null> {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, platformChatId: true, linkTtlHours: true },
  })

  if (!channel) {
    logger.warn({ channelId }, 'Channel not found for invite link creation')
    return null
  }

  if (!checkRateLimit(channelId)) {
    logger.warn({ channelId }, 'Rate limit exceeded for invite link creation')
    return null
  }

  const expiresAt = new Date(Date.now() + channel.linkTtlHours * 3_600_000)
  const expireDate = Math.floor(expiresAt.getTime() / 1000)

  let inviteLinkUrl: string
  try {
    const result = await withRetry(() =>
      bot.api.createChatInviteLink(channel.platformChatId, {
        member_limit: 1,
        expire_date: expireDate,
      }),
    )
    inviteLinkUrl = result.invite_link
  } catch (err) {
    logger.error({ channelId, visitId, err }, 'Failed to create invite link via Telegram API')
    return null
  }

  recordRateLimitUse(channelId)

  const link = await prisma.inviteLink.create({
    data: {
      channelId: channel.id,
      visitId,
      url: inviteLinkUrl,
      type: 'auto',
      expiresAt,
    },
    select: { id: true },
  })

  logger.info({ linkId: link.id, channelId, visitId }, 'Created invite link')
  return { url: inviteLinkUrl, linkId: link.id }
}

export async function revokeInviteLink(bot: Bot, linkId: number): Promise<void> {
  const link = await prisma.inviteLink.findUnique({
    where: { id: linkId },
    select: { id: true, url: true, isRevoked: true, channel: { select: { platformChatId: true } } },
  })

  if (!link || link.isRevoked) return

  try {
    await bot.api.revokeChatInviteLink(link.channel.platformChatId, link.url)
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 400) {
      logger.warn({ linkId }, 'Invite link already revoked or expired on Telegram side')
    } else {
      logger.error({ linkId, err }, 'Unexpected error revoking invite link')
    }
  }

  await prisma.inviteLink.update({
    where: { id: linkId },
    data: { isRevoked: true },
  })

  logger.info({ linkId }, 'Revoked invite link')
}

export async function revokeAfterJoin(
  bot: Bot,
  inviteLinkUrl: string,
  channelId: number,
): Promise<void> {
  const link = await prisma.inviteLink.findFirst({
    where: { url: inviteLinkUrl, channelId, isRevoked: false, type: 'auto' },
    select: { id: true },
  })

  if (!link) return

  await revokeInviteLink(bot, link.id)
}
