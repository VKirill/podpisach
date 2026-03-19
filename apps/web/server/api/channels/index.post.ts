import { z } from 'zod'
import { decrypt } from '@ps/shared'

const createChannelSchema = z.object({
  channelId: z.string().min(1).max(200),
  botId: z.number().int().positive(),
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
  }
}

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, createChannelSchema)

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  const bot = await prisma.bot.findFirst({
    where: { id: body.botId, isActive: true },
  })
  if (!bot) {
    throw createError({ statusCode: 404, message: 'Bot not found or inactive' })
  }

  const token = decrypt(bot.token, settings.internalApiSecret)
  const chatId = body.channelId

  // Получаем информацию о канале и ID бота параллельно
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

  // Проверяем права администратора
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

  // Если канал уже существует — обновляем или сообщаем об ошибке
  const existing = await prisma.channel.findUnique({
    where: { platform_platformChatId: { platform: bot.platform, platformChatId } },
  })

  if (existing?.isActive) {
    throw createError({ statusCode: 409, message: 'Channel already connected' })
  }

  if (existing) {
    return prisma.channel.update({
      where: { id: existing.id },
      data: { isActive: true, botId: bot.id, title: chatInfo.title, username: chatInfo.username },
      include: {
        bot: { select: { id: true, platform: true, botUsername: true, botName: true } },
        _count: { select: { subscribers: true, inviteLinks: true } },
      },
    })
  }

  return prisma.channel.create({
    data: {
      botId: bot.id,
      platform: bot.platform,
      platformChatId,
      title: chatInfo.title,
      username: chatInfo.username,
      isPrivate: !chatInfo.username,
    },
    include: {
      bot: { select: { id: true, platform: true, botUsername: true, botName: true } },
      _count: { select: { subscribers: true, inviteLinks: true } },
    },
  })
})
