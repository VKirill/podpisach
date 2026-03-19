import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    settings: { findFirst: vi.fn() },
    visit: { findFirst: vi.fn() },
  },
}))
vi.mock('../../src/utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { maxMatch } from '../../src/attribution/maxMatcher.ts'
import { prisma } from '../../src/utils/prisma.js'

const mockSettingsFindFirst = vi.mocked(prisma.settings.findFirst)
const mockVisitFindFirst = vi.mocked(prisma.visit.findFirst)

const JOIN_TIMESTAMP = new Date('2025-06-01T12:00:00.000Z')

describe('maxMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: settings returns default window (60 sec)
    // @ts-expect-error partial mock
    mockSettingsFindFirst.mockResolvedValue({ maxCorrelationWindowSec: 60 })
  })

  describe('Strategy 1: fingerprint correlation', () => {
    it('returns confidence 0.80 and method fingerprint when fingerprint visit is found', async () => {
      // @ts-expect-error partial mock
      mockVisitFindFirst.mockResolvedValueOnce({ id: 10 }) // fingerprint match

      const result = await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      expect(result).toEqual({
        visitId: 10,
        inviteLinkId: null,
        confidence: 0.80,
        method: 'fingerprint',
      })
    })

    it('queries visits with fingerprint not null within time window', async () => {
      // @ts-expect-error partial mock
      mockVisitFindFirst.mockResolvedValueOnce({ id: 10 })

      await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      const firstCall = mockVisitFindFirst.mock.calls[0]![0]
      expect(firstCall.where).toMatchObject({
        channelId: 1,
        platform: 'max',
        subscriber: null,
        fingerprint: { not: null },
      })
      // Window is ±60s from JOIN_TIMESTAMP
      expect(firstCall.where.createdAt.gte.getTime()).toBe(
        JOIN_TIMESTAMP.getTime() - 60 * 1000,
      )
      expect(firstCall.where.createdAt.lte.getTime()).toBe(
        JOIN_TIMESTAMP.getTime() + 60 * 1000,
      )
    })
  })

  describe('Strategy 2: ipHash fallback correlation', () => {
    it('returns confidence 0.70 and method time_correlation when only ipHash visit is found', async () => {
      mockVisitFindFirst
        .mockResolvedValueOnce(null) // fingerprint: no match
        // @ts-expect-error partial mock
        .mockResolvedValueOnce({ id: 20 }) // ipHash: match

      const result = await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      expect(result).toEqual({
        visitId: 20,
        inviteLinkId: null,
        confidence: 0.70,
        method: 'time_correlation',
      })
    })

    it('queries visits with ipHash not null within time window on second attempt', async () => {
      mockVisitFindFirst
        .mockResolvedValueOnce(null)
        // @ts-expect-error partial mock
        .mockResolvedValueOnce({ id: 20 })

      await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      const secondCall = mockVisitFindFirst.mock.calls[1]![0]
      expect(secondCall.where).toMatchObject({
        channelId: 1,
        platform: 'max',
        subscriber: null,
        ipHash: { not: null },
      })
    })
  })

  describe('Fallback: no visits in window', () => {
    it('returns confidence 0 and method none when no visits found', async () => {
      mockVisitFindFirst.mockResolvedValue(null)

      const result = await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      expect(result).toEqual({
        visitId: null,
        inviteLinkId: null,
        confidence: 0,
        method: 'none',
      })
    })
  })

  describe('Configurable correlation window', () => {
    it('loads window from settings.maxCorrelationWindowSec', async () => {
      // @ts-expect-error partial mock
      mockSettingsFindFirst.mockResolvedValue({ maxCorrelationWindowSec: 120 })
      // @ts-expect-error partial mock
      mockVisitFindFirst.mockResolvedValueOnce({ id: 5 })

      await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      expect(mockSettingsFindFirst).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { maxCorrelationWindowSec: true },
      })

      const firstCall = mockVisitFindFirst.mock.calls[0]![0]
      // 120 second window
      expect(firstCall.where.createdAt.gte.getTime()).toBe(
        JOIN_TIMESTAMP.getTime() - 120 * 1000,
      )
      expect(firstCall.where.createdAt.lte.getTime()).toBe(
        JOIN_TIMESTAMP.getTime() + 120 * 1000,
      )
    })

    it('falls back to DEFAULT_CORRELATION_WINDOW_SEC (60s) when settings is null', async () => {
      mockSettingsFindFirst.mockResolvedValue(null)
      // @ts-expect-error partial mock
      mockVisitFindFirst.mockResolvedValueOnce({ id: 5 })

      await maxMatch(1, 'user-1', JOIN_TIMESTAMP)

      const firstCall = mockVisitFindFirst.mock.calls[0]![0]
      // Default 60 second window
      expect(firstCall.where.createdAt.gte.getTime()).toBe(
        JOIN_TIMESTAMP.getTime() - 60 * 1000,
      )
      expect(firstCall.where.createdAt.lte.getTime()).toBe(
        JOIN_TIMESTAMP.getTime() + 60 * 1000,
      )
    })
  })
})
