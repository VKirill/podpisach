import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Bot } from 'grammy'

// Mock prisma (2 levels up from tests/services/)
vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    channel: {
      findUnique: vi.fn(),
    },
    inviteLink: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock retry as passthrough
vi.mock('../../src/utils/retry.js', () => ({
  withRetry: (fn: () => unknown) => fn(),
}))

const { prisma } = await import('../../src/utils/prisma.js')
const { createInviteLink, revokeInviteLink, revokeAfterJoin } = await import(
  '../../src/telegram/services/linkService.js'
)

const mockChannel = {
  id: 1,
  platformChatId: '-100123456',
  linkTtlHours: 24,
}

const mockBot = {
  api: {
    createChatInviteLink: vi.fn().mockResolvedValue({ invite_link: 'https://t.me/+test123' }),
    revokeChatInviteLink: vi.fn().mockResolvedValue({}),
  },
} as unknown as Bot

describe('createInviteLink', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    ;(prisma.channel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockChannel)
    ;(prisma.inviteLink.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 42 })
    ;(mockBot.api.createChatInviteLink as ReturnType<typeof vi.fn>).mockResolvedValue({
      invite_link: 'https://t.me/+test123',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('создаёт авто-ссылку с member_limit=1 и expire_date', async () => {
    const result = await createInviteLink(mockBot, 1, 10)

    expect(result).toEqual({ url: 'https://t.me/+test123', linkId: 42 })
    expect(mockBot.api.createChatInviteLink).toHaveBeenCalledWith(
      mockChannel.platformChatId,
      expect.objectContaining({ member_limit: 1, expire_date: expect.any(Number) }),
    )
  })

  it('создаёт ручную ссылку без member_limit и expire_date', async () => {
    const result = await createInviteLink(mockBot, 1, undefined, { name: 'Test link' })

    expect(result).toEqual({ url: 'https://t.me/+test123', linkId: 42 })
    expect(mockBot.api.createChatInviteLink).toHaveBeenCalledWith(
      mockChannel.platformChatId,
      {},
    )
    // inviteLink.create должен быть вызван без visitId и expiresAt
    expect(prisma.inviteLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'manual', name: 'Test link' }),
      }),
    )
  })

  it('возвращает null если канал не найден', async () => {
    ;(prisma.channel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createInviteLink(mockBot, 999, 10)

    expect(result).toBeNull()
    expect(mockBot.api.createChatInviteLink).not.toHaveBeenCalled()
  })

  it('возвращает null после превышения rate limit (20 вызовов/мин)', async () => {
    // Используем channelId=2 чтобы не пересекаться с другими тестами
    ;(prisma.channel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockChannel,
      id: 2,
    })

    for (let i = 0; i < 20; i++) {
      const r = await createInviteLink(mockBot, 2, i + 1)
      expect(r).not.toBeNull()
    }

    // 21й вызов — должен быть заблокирован
    const result = await createInviteLink(mockBot, 2, 21)
    expect(result).toBeNull()
  })

  it('rate limit сбрасывается через 60 секунд', async () => {
    // Используем channelId=3 для изоляции
    ;(prisma.channel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockChannel,
      id: 3,
    })

    for (let i = 0; i < 20; i++) {
      await createInviteLink(mockBot, 3, i + 1)
    }

    // Сдвигаем время на 61 секунду
    vi.advanceTimersByTime(61_000)

    const result = await createInviteLink(mockBot, 3, 100)
    expect(result).not.toBeNull()
  })
})

describe('revokeInviteLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockBot.api.revokeChatInviteLink as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(prisma.inviteLink.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  it('отзывает ссылку через bot.api и обновляет isRevoked в БД', async () => {
    ;(prisma.inviteLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      url: 'https://t.me/+abc',
      isRevoked: false,
      channel: { platformChatId: '-100123456' },
    })

    await revokeInviteLink(mockBot, 5)

    expect(mockBot.api.revokeChatInviteLink).toHaveBeenCalledWith('-100123456', 'https://t.me/+abc')
    expect(prisma.inviteLink.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isRevoked: true },
    })
  })

  it('пропускает уже отозванную ссылку (isRevoked=true)', async () => {
    ;(prisma.inviteLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5,
      url: 'https://t.me/+abc',
      isRevoked: true,
      channel: { platformChatId: '-100123456' },
    })

    await revokeInviteLink(mockBot, 5)

    expect(mockBot.api.revokeChatInviteLink).not.toHaveBeenCalled()
    expect(prisma.inviteLink.update).not.toHaveBeenCalled()
  })

  it('пропускает если ссылка не найдена', async () => {
    ;(prisma.inviteLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await revokeInviteLink(mockBot, 999)

    expect(mockBot.api.revokeChatInviteLink).not.toHaveBeenCalled()
  })
})

describe('revokeAfterJoin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockBot.api.revokeChatInviteLink as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(prisma.inviteLink.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
  })

  it('находит авто-ссылку по URL и отзывает её', async () => {
    ;(prisma.inviteLink.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 7 })
    ;(prisma.inviteLink.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 7,
      url: 'https://t.me/+join',
      isRevoked: false,
      channel: { platformChatId: '-100123456' },
    })

    await revokeAfterJoin(mockBot, 'https://t.me/+join', 1)

    expect(prisma.inviteLink.findFirst).toHaveBeenCalledWith({
      where: {
        url: 'https://t.me/+join',
        channelId: 1,
        isRevoked: false,
        type: 'auto',
      },
      select: { id: true },
    })
    expect(mockBot.api.revokeChatInviteLink).toHaveBeenCalled()
  })

  it('ничего не делает если авто-ссылка не найдена', async () => {
    ;(prisma.inviteLink.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    await revokeAfterJoin(mockBot, 'https://t.me/+unknown', 1)

    expect(prisma.inviteLink.update).not.toHaveBeenCalled()
  })
})
