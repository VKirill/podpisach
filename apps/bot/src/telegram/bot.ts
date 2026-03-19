import { Bot } from 'grammy'
import { setupCommands } from './handlers/commands.js'
import { setupMemberUpdateHandler } from './handlers/memberUpdate.js'
import { logger } from '../utils/logger.js'

let currentBot: Bot | null = null

export function createTelegramBot(token: string): Bot {
  const bot = new Bot(token)

  bot.use(async (ctx, next) => {
    logger.debug({ updateId: ctx.update.update_id }, 'Received update')
    await next()
  })

  setupCommands(bot)
  setupMemberUpdateHandler(bot)

  bot.catch((err) => {
    logger.error({ err: err.error, updateId: err.ctx?.update?.update_id }, 'Bot error')
  })

  return bot
}

export async function startBot(bot: Bot): Promise<void> {
  currentBot = bot

  const me = await bot.api.getMe()
  logger.info({ username: me.username, name: me.first_name }, '✅ Telegram bot started')

  bot.start({
    onStart: (me) => logger.info({ username: me.username }, 'Long polling started'),
    allowed_updates: ['chat_member', 'message'],
  })
}

export async function stopBot(): Promise<void> {
  if (currentBot) {
    await currentBot.stop()
    currentBot = null
    logger.info('Telegram bot stopped')
  }
}

export function getBot(): Bot | null {
  return currentBot
}
