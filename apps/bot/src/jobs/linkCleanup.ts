import cron from 'node-cron'
import type { ScheduledTask } from 'node-cron'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'
import { getBot } from '../telegram/bot.js'

export function startLinkCleanupJob(): ScheduledTask {
  const task = cron.schedule('*/5 * * * *', async () => {
    const bot = getBot()
    if (!bot) return

    const expiredLinks = await prisma.inviteLink.findMany({
      where: {
        isRevoked: false,
        type: 'auto',
        expiresAt: { lte: new Date() },
      },
      select: {
        id: true,
        url: true,
        channel: { select: { platformChatId: true } },
      },
      take: 50,
    })

    for (const link of expiredLinks) {
      try {
        await bot.api.revokeChatInviteLink(link.channel.platformChatId, link.url)
      } catch {
        // Link may have already expired or been revoked on Telegram side
      }

      await prisma.inviteLink.update({
        where: { id: link.id },
        data: { isRevoked: true },
      })
    }

    if (expiredLinks.length > 0) {
      logger.info({ count: expiredLinks.length }, 'Cleaned up expired invite links')
    }
  })

  logger.info('🔄 Link cleanup job scheduled (every 5 min)')
  return task
}
