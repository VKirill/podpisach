import type { AttributionResult } from './correlator.js'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'
import { CONFIDENCE, DEFAULT_CORRELATION_WINDOW_SEC } from '@ps/shared'

/**
 * Probabilistic attribution for MAX subscribers.
 * MAX Bot API does not provide invite_link in events, so correlation is done
 * by matching the join timestamp against recent unattributed visits.
 *
 * Strategy 1: Match by fingerprint + time window (±windowSec, ~80% accuracy).
 * Strategy 2: Fallback — match by ipHash + time window (~70% accuracy).
 */
export async function maxMatch(
  channelId: number,
  userId: string,
  joinTimestamp: Date,
): Promise<AttributionResult> {
  // Load configurable correlation window from Settings (id=1 is the singleton)
  const settings = await prisma.settings.findFirst({
    where: { id: 1 },
    select: { maxCorrelationWindowSec: true },
  })
  const windowSec = settings?.maxCorrelationWindowSec ?? DEFAULT_CORRELATION_WINDOW_SEC

  const windowStart = new Date(joinTimestamp.getTime() - windowSec * 1000)
  const windowEnd = new Date(joinTimestamp.getTime() + windowSec * 1000)

  // Strategy 1: correlation by fingerprint + time window
  const visitByFingerprint = await prisma.visit.findFirst({
    where: {
      channelId,
      platform: 'max',
      subscriber: null,
      fingerprint: { not: null },
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (visitByFingerprint) {
    logger.debug(
      { channelId, userId, visitId: visitByFingerprint.id },
      'MAX: match by fingerprint',
    )
    return {
      visitId: visitByFingerprint.id,
      inviteLinkId: null,
      confidence: CONFIDENCE.MEDIUM_MAX,
      method: 'fingerprint',
    }
  }

  // Strategy 2: fallback — correlation by ipHash + time window
  const visitByIp = await prisma.visit.findFirst({
    where: {
      channelId,
      platform: 'max',
      subscriber: null,
      ipHash: { not: null },
      createdAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (visitByIp) {
    logger.debug({ channelId, userId, visitId: visitByIp.id }, 'MAX: match by ipHash')
    return {
      visitId: visitByIp.id,
      inviteLinkId: null,
      confidence: CONFIDENCE.LOW_MAX,
      method: 'time_correlation',
    }
  }

  logger.debug({ channelId, userId, joinTimestamp }, 'MAX: no visit found for correlation')
  return { visitId: null, inviteLinkId: null, confidence: 0, method: 'none' }
}
