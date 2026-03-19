import type { AttributionResult } from './correlator.js'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'
import { CONFIDENCE } from '@op/shared'

/**
 * Exact attribution for Telegram subscribers.
 *
 * Strategy 1: Match by invite_link URL (private channels, ~95% accuracy).
 * Strategy 2: Fallback — last unattributed visit in past 24h (public channels, ~50% accuracy).
 */
export async function telegramMatch(
  channelId: number,
  userId: string,
  inviteLinkUrl?: string,
): Promise<AttributionResult> {
  // Strategy 1: exact match by invite_link (private channels)
  if (inviteLinkUrl) {
    const inviteLink = await prisma.inviteLink.findFirst({
      where: {
        url: inviteLinkUrl,
        channelId,
      },
      include: { visit: true },
    })

    if (inviteLink) {
      logger.debug({ channelId, userId, inviteLinkUrl }, 'TG: exact match by invite_link')
      return {
        visitId: inviteLink.visit?.id ?? null,
        inviteLinkId: inviteLink.id,
        confidence: CONFIDENCE.EXACT_TG,
        method: 'invite_link',
      }
    }
  }

  // Strategy 2: fallback — most recent unattributed visit in last 24h (public channels)
  const recentVisit = await prisma.visit.findFirst({
    where: {
      channelId,
      platform: 'telegram',
      subscriber: null,
      createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (recentVisit) {
    logger.debug({ channelId, userId, visitId: recentVisit.id }, 'TG: fallback time correlation')
    return {
      visitId: recentVisit.id,
      inviteLinkId: null,
      confidence: 0.5,
      method: 'time_correlation',
    }
  }

  logger.debug({ channelId, userId }, 'TG: no visit found for attribution')
  return { visitId: null, inviteLinkId: null, confidence: 0, method: 'none' }
}
