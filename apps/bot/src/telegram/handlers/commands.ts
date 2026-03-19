import type { Bot } from 'grammy'
import { logger } from '../../utils/logger.js'

export function setupCommands(bot: Bot): void {
  bot.command('start', async (ctx) => {
    logger.debug({ userId: ctx.from?.id }, '/start command')
    await ctx.reply(
      '👋 Привет! Я бот системы «Откуда подписчик».\n\n' +
      'Я отслеживаю подписки и отписки в ваших каналах.\n\n' +
      'Используйте /help для справки.',
    )
  })

  bot.command('help', async (ctx) => {
    logger.debug({ userId: ctx.from?.id }, '/help command')
    await ctx.reply(
      '📖 Справка\n\n' +
      'Этот бот используется для атрибуции подписчиков Telegram-каналов.\n\n' +
      'Управление выполняется через веб-интерфейс системы.',
    )
  })
}
