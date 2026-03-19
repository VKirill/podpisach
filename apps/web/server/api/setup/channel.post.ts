import { z } from 'zod'
import { decrypt } from '@op/shared'

const setupChannelSchema = z.object({
  channelId: z.string().min(1).max(200),
})

interface TelegramGetMeResult {
  ok: boolean
  result: { id: number }
}

interface TelegramGetChatResult {
  ok: boolean
  result: {
    id: number
    title: string
    username?: string
    type: string
  }
}

interface TelegramGetChatMemberResult {
  ok: boolean
  result: {
    status: string
    user: { id: number }
  }
}

export default defineEventHandler(async (event) => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  if (settings.setupCompleted) {
    throw createError({ statusCode: 403, message: 'Setup already completed' })
  }

  const body = await validateBody(event, setupChannelSchema)

  // Ищем активного Telegram-бота
  const bot = await prisma.bot.findFirst({
    where: { platform: 'telegram', isActive: true },
  })
  if (!bot) {
    throw createError({ statusCode: 400, message: 'No Telegram bot configured' })
  }

  // Расшифровываем токен бота
  const token = decrypt(bot.token, settings.internalApiSecret)
  const chatId = body.channelId

  // Получаем информацию о канале и проверяем, что бот — администратор
  let chatInfo: TelegramGetChatResult['result']
  let botUserId: number

  try {
    const [meResponse, chatResponse] = await Promise.all([
      $fetch<TelegramGetMeResult>(`https://api.telegram.org/bot${token}/getMe`),
      $fetch<TelegramGetChatResult>(
        `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      ),
    ])

    if (!meResponse.ok) {
      throw createError({ statusCode: 400, message: 'Bot token is no longer valid' })
    }
    if (!chatResponse.ok) {
      throw createError({ statusCode: 400, message: 'Channel not found or bot is not a member' })
    }

    botUserId = meResponse.result.id
    chatInfo = chatResponse.result
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    throw createError({ statusCode: 400, message: 'Failed to get channel info from Telegram' })
  }

  // Проверяем, что бот является администратором канала
  try {
    const memberResponse = await $fetch<TelegramGetChatMemberResult>(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${botUserId}`,
    )

    const adminStatuses = ['administrator', 'creator']
    if (!memberResponse.ok || !adminStatuses.includes(memberResponse.result.status)) {
      throw createError({
        statusCode: 400,
        message: 'Bot must be an administrator of the channel',
      })
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    throw createError({ statusCode: 400, message: 'Failed to check bot admin status' })
  }

  const platformChatId = String(chatInfo.id)

  // Если канал уже существует — реактивируем
  const existingChannel = await prisma.channel.findUnique({
    where: { platform_platformChatId: { platform: 'telegram', platformChatId } },
  })

  if (existingChannel) {
    if (existingChannel.isActive) {
      throw createError({ statusCode: 409, message: 'Channel already configured' })
    }
    const updated = await prisma.channel.update({
      where: { id: existingChannel.id },
      data: { isActive: true, botId: bot.id },
    })
    return { success: true, channelId: updated.id }
  }

  const channel = await prisma.channel.create({
    data: {
      botId: bot.id,
      platform: 'telegram',
      platformChatId,
      title: chatInfo.title,
      username: chatInfo.username,
      // Публичные каналы имеют username; приватные — нет
      isPrivate: !chatInfo.username,
      isActive: true,
    },
  })

  return { success: true, channelId: channel.id }
})
