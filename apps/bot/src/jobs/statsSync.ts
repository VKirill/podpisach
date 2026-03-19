import cron from 'node-cron'
import type { ScheduledTask } from 'node-cron'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'
import { getBot } from '../telegram/bot.js'

export function startStatsSyncJob(): ScheduledTask {
  const task = cron.schedule('0 * * * *', async () => {
    const bot = getBot()
    if (!bot) return

    const channels = await prisma.channel.findMany({
      where: { isActive: true, platform: 'telegram' },
      select: { id: true, platformChatId: true },
    })

    let synced = 0

    for (const channel of channels) {
      try {
        const count = await bot.api.getChatMemberCount(channel.platformChatId)
        await prisma.channel.update({
          where: { id: channel.id },
          data: { subscriberCount: count },
        })
        synced++
      } catch (err) {
        logger.warn({ channelId: channel.id, err }, 'Failed to sync subscriber count')
      }
    }

    if (synced > 0) {
      logger.info({ synced, total: channels.length }, 'Synced subscriber counts')
    }
  })

  logger.info('📊 Stats sync job scheduled (every hour)')
  return task
}
