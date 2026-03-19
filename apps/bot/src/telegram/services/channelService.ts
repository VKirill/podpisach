import type { Bot } from 'grammy'
import type { Chat } from 'grammy/types'
import { logger } from '../../utils/logger.js'

export async function getChannelInfo(bot: Bot, chatId: number): Promise<Chat> {
  return bot.api.getChat(chatId)
}

export async function verifyBotIsAdmin(bot: Bot, chatId: number): Promise<boolean> {
  try {
    const member = await bot.api.getChatMember(chatId, bot.botInfo.id)
    return member.status === 'administrator' || member.status === 'creator'
  } catch (err) {
    logger.warn({ chatId, err }, 'Failed to verify bot admin status')
    return false
  }
}
