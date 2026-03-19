import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    inviteLink: { findFirst: vi.fn() },
    visit: { findFirst: vi.fn() },
  },
}))
vi.mock('../../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { telegramMatch } from '../../src/attribution/telegramMatcher.ts'
import { prisma } from '../../src/utils/prisma.js'

const mockInviteLinkFindFirst = vi.mocked(prisma.inviteLink.findFirst)
const mockVisitFindFirst = vi.mocked(prisma.visit.findFirst)

describe('telegramMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Strategy 1: exact match by invite_link URL', () => {
    it('returns confidence 1.0 and method invite_link when invite URL is found', async () => {
      const mockLink = {
        id: 42,
        visit: { id: 7 },
      }
      // @ts-expect-error partial mock
      mockInviteLinkFindFirst.mockResolvedValue(mockLink)

      const result = await telegramMatch(1, 'user-1', 'https://t.me/+abc123')

      expect(mockInviteLinkFindFirst).toHaveBeenCalledWith({
        where: { url: 'https://t.me/+abc123', channelId: 1 },
        include: { visit: true },
      })
      expect(result).toEqual({
        visitId: 7,
        inviteLinkId: 42,
        confidence: 1.0,
        method: 'invite_link',
      })
    })

    it('returns visitId null when invite link has no associated visit', async () => {
      const mockLink = { id: 42, visit: null }
      // @ts-expect-error partial mock
      mockInviteLinkFindFirst.mockResolvedValue(mockLink)

      const result = await telegramMatch(1, 'user-1', 'https://t.me/+abc123')

      expect(result.visitId).toBeNull()
      expect(result.inviteLinkId).toBe(42)
      expect(result.confidence).toBe(1.0)
      expect(result.method).toBe('invite_link')
    })

    it('falls through to strategy 2 when invite link URL is not in DB', async () => {
      mockInviteLinkFindFirst.mockResolvedValue(null)
      // @ts-expect-error partial mock
      mockVisitFindFirst.mockResolvedValue({ id: 99 })

      await telegramMatch(1, 'user-1', 'https://t.me/+notfound')

      expect(mockVisitFindFirst).toHaveBeenCalled()
    })
  })

  describe('Strategy 2: fallback time correlation (no invite link)', () => {
    it('returns confidence 0.5 and method time_correlation when recent visit is found', async () => {
      // @ts-expect-error partial mock
      mockVisitFindFirst.mockResolvedValue({ id: 55 })

      const result = await telegramMatch(1, 'user-1')

      expect(mockInviteLinkFindFirst).not.toHaveBeenCalled()
      expect(mockVisitFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channelId: 1,
            platform: 'telegram',
            subscriber: null,
          }),
          orderBy: { createdAt: 'desc' },
        }),
      )
      expect(result).toEqual({
        visitId: 55,
        inviteLinkId: null,
        confidence: 0.5,
        method: 'time_correlation',
      })
    })

    it('queries visits created within last 24 hours', async () => {
      const before = Date.now()
      mockVisitFindFirst.mockResolvedValue(null)

      await telegramMatch(1, 'user-1')

      const callArgs = mockVisitFindFirst.mock.calls[0]![0]
      const gte: Date = callArgs.where.createdAt.gte
      const after = Date.now()

      // The 24h threshold should be approximately 24h ago
      const expectedMs = 24 * 3600 * 1000
      expect(before - gte.getTime()).toBeGreaterThanOrEqual(expectedMs - 100)
      expect(after - gte.getTime()).toBeLessThanOrEqual(expectedMs + 100)
    })
  })

  describe('Fallback: no match', () => {
    it('returns confidence 0 and method none when no visits exist', async () => {
      mockInviteLinkFindFirst.mockResolvedValue(null)
      mockVisitFindFirst.mockResolvedValue(null)

      const result = await telegramMatch(1, 'user-1', 'https://t.me/+abc')

      expect(result).toEqual({
        visitId: null,
        inviteLinkId: null,
        confidence: 0,
        method: 'none',
      })
    })

    it('returns confidence 0 and method none when inviteLinkUrl omitted and no recent visit', async () => {
      mockVisitFindFirst.mockResolvedValue(null)

      const result = await telegramMatch(1, 'user-1')

      expect(result).toEqual({
        visitId: null,
        inviteLinkId: null,
        confidence: 0,
        method: 'none',
      })
    })
  })
})
