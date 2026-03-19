import type { Platform } from '@op/shared'
import { telegramMatch } from './telegramMatcher.js'
import { maxMatch } from './maxMatcher.js'
import { logger } from '../utils/logger.js'

export interface AttributionResult {
  visitId: number | null
  inviteLinkId: number | null
  confidence: number
  method: 'invite_link' | 'time_correlation' | 'fingerprint' | 'none'
}

/**
 * Correlates a channel join event with a landing page visit.
 * Routes to platform-specific matchers:
 *   - telegram: exact match by invite_link, fallback to recent unattributed visit
 *   - max: probabilistic match by fingerprint/ipHash within time window
 */
export async function correlate(
  platform: Platform,
  channelId: number,
  userId: string,
  inviteLinkUrl?: string,
  joinTimestamp?: Date,
): Promise<AttributionResult> {
  logger.debug({ platform, channelId, userId }, 'Starting attribution correlation')

  if (platform === 'telegram') {
    return telegramMatch(channelId, userId, inviteLinkUrl)
  }

  if (platform === 'max') {
    return maxMatch(channelId, userId, joinTimestamp ?? new Date())
  }

  return { visitId: null, inviteLinkId: null, confidence: 0, method: 'none' }
}
