import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock matchers BEFORE importing correlator (hoisting)
vi.mock('../../src/attribution/telegramMatcher.js', () => ({
  telegramMatch: vi.fn(),
}))
vi.mock('../../src/attribution/maxMatcher.js', () => ({
  maxMatch: vi.fn(),
}))
vi.mock('../../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { correlate } from '../../src/attribution/correlator.ts'
import { telegramMatch } from '../../src/attribution/telegramMatcher.js'
import { maxMatch } from '../../src/attribution/maxMatcher.js'

const mockTelegramMatch = vi.mocked(telegramMatch)
const mockMaxMatch = vi.mocked(maxMatch)

const TELEGRAM_RESULT = {
  visitId: 1,
  inviteLinkId: 2,
  confidence: 1.0,
  method: 'invite_link' as const,
}
const MAX_RESULT = {
  visitId: 3,
  inviteLinkId: null,
  confidence: 0.80,
  method: 'fingerprint' as const,
}

describe('correlate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTelegramMatch.mockResolvedValue(TELEGRAM_RESULT)
    mockMaxMatch.mockResolvedValue(MAX_RESULT)
  })

  it('routes telegram platform to telegramMatch', async () => {
    const result = await correlate('telegram', 100, 'user-1', 'https://t.me/+abc')

    expect(mockTelegramMatch).toHaveBeenCalledWith(100, 'user-1', 'https://t.me/+abc')
    expect(mockMaxMatch).not.toHaveBeenCalled()
    expect(result).toEqual(TELEGRAM_RESULT)
  })

  it('routes max platform to maxMatch', async () => {
    const ts = new Date('2025-01-01T12:00:00Z')
    const result = await correlate('max', 200, 'user-2', undefined, ts)

    expect(mockMaxMatch).toHaveBeenCalledWith(200, 'user-2', ts)
    expect(mockTelegramMatch).not.toHaveBeenCalled()
    expect(result).toEqual(MAX_RESULT)
  })

  it('passes current date to maxMatch when joinTimestamp is omitted', async () => {
    const before = Date.now()
    await correlate('max', 200, 'user-2')
    const after = Date.now()

    const calledWith = mockMaxMatch.mock.calls[0]![2] as Date
    expect(calledWith.getTime()).toBeGreaterThanOrEqual(before)
    expect(calledWith.getTime()).toBeLessThanOrEqual(after)
  })

  it('returns confidence 0 and method none for unknown platform', async () => {
    // @ts-expect-error testing unknown platform
    const result = await correlate('unknown', 300, 'user-3')

    expect(mockTelegramMatch).not.toHaveBeenCalled()
    expect(mockMaxMatch).not.toHaveBeenCalled()
    expect(result).toEqual({
      visitId: null,
      inviteLinkId: null,
      confidence: 0,
      method: 'none',
    })
  })

  it('passes undefined inviteLinkUrl to telegramMatch when not provided', async () => {
    await correlate('telegram', 100, 'user-1')

    expect(mockTelegramMatch).toHaveBeenCalledWith(100, 'user-1', undefined)
  })
})
