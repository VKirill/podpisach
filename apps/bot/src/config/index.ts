import { decrypt } from '@op/shared'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'

export interface BotConfig {
  telegramToken: string | null
  maxToken: string | null
  internalApiSecret: string
  maxCorrelationWindowSec: number
}

const RETRY_INTERVAL_MS = 5_000
const MAX_RETRY_DURATION_MS = 30_000

async function loadSettings(): Promise<{ internalApiSecret: string; maxCorrelationWindowSec: number }> {
  const deadline = Date.now() + MAX_RETRY_DURATION_MS

  while (Date.now() < deadline) {
    try {
      const settings = await prisma.settings.findFirst({ where: { id: 1 } })
      if (settings) {
        return {
          internalApiSecret: settings.internalApiSecret,
          maxCorrelationWindowSec: settings.maxCorrelationWindowSec,
        }
      }
      logger.warn('Settings (id=1) not found — retrying in 5s...')
    } catch (err) {
      logger.warn({ err }, 'Prisma error while loading settings — retrying in 5s...')
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS))
  }

  throw new Error('Settings not found after 30s. Ensure seed has been run.')
}

export async function loadConfig(): Promise<BotConfig> {
  const settings = await loadSettings()

  const telegramBot = await prisma.bot.findFirst({
    where: { platform: 'telegram', isActive: true },
  })

  const maxBot = await prisma.bot.findFirst({
    where: { platform: 'max', isActive: true },
  })

  const telegramToken = telegramBot
    ? decrypt(telegramBot.token, settings.internalApiSecret)
    : null

  const maxToken = maxBot
    ? decrypt(maxBot.token, settings.internalApiSecret)
    : null

  return {
    telegramToken,
    maxToken,
    internalApiSecret: settings.internalApiSecret,
    maxCorrelationWindowSec: settings.maxCorrelationWindowSec,
  }
}
