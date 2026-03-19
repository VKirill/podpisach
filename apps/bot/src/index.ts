import type { ScheduledTask } from 'node-cron'
import { loadConfig } from './config/index.js'
import { createTelegramBot, startBot, stopBot } from './telegram/bot.js'
import { startLinkCleanupJob } from './jobs/linkCleanup.js'
import { startStatsSyncJob } from './jobs/statsSync.js'
import { startConversionRetryJob } from './jobs/conversionRetry.js'
import { prisma } from './utils/prisma.js'
import { logger } from './utils/logger.js'
import { decrypt } from '@op/shared'
import { startInternalApi, stopInternalApi } from './api/internal.js'

const POLL_INTERVAL_MS = 5_000

let isShuttingDown = false
let linkCleanupTask: ScheduledTask | null = null
let statsSyncTask: ScheduledTask | null = null
let conversionRetryTask: ScheduledTask | null = null

async function pollForToken(internalApiSecret: string): Promise<string> {
  logger.info('⏳ No bot token configured. Polling DB every 5s...')

  while (!isShuttingDown) {
    const bot = await prisma.bot.findFirst({
      where: { platform: 'telegram', isActive: true },
    })

    if (bot) {
      const token = decrypt(bot.token, internalApiSecret)
      logger.info('🔑 Bot token found in DB, starting bot...')
      return token
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error('Shutdown before token was configured')
}

async function main(): Promise<void> {
  logger.info('🤖 Bot process starting...')

  const config = await loadConfig()

  await startInternalApi(3001)

  let token: string

  if (config.telegramToken) {
    token = config.telegramToken
  } else {
    token = await pollForToken(config.internalApiSecret)
  }

  if (isShuttingDown) return

  const bot = createTelegramBot(token)
  await startBot(bot)

  linkCleanupTask = startLinkCleanupJob()
  statsSyncTask = startStatsSyncJob()
  conversionRetryTask = startConversionRetryJob()
}

const shutdown = async (): Promise<void> => {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info('Shutting down...')

  linkCleanupTask?.stop()
  statsSyncTask?.stop()
  conversionRetryTask?.stop()

  await stopInternalApi()
  await stopBot()
  await prisma.$disconnect()

  logger.info('Shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
