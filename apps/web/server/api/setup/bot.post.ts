import { setupBotSchema, encrypt } from '@op/shared'

interface TelegramGetMeResult {
  ok: boolean
  result: {
    id: number
    username: string
    first_name: string
    is_bot: boolean
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

  const body = await validateBody(event, setupBotSchema)

  let botUsername: string | undefined
  let botName: string | undefined

  if (body.platform === 'telegram') {
    // Проверяем токен через Telegram Bot API
    let meResult: TelegramGetMeResult['result']
    try {
      const response = await $fetch<TelegramGetMeResult>(
        `https://api.telegram.org/bot${body.token}/getMe`,
      )
      if (!response.ok) {
        throw createError({ statusCode: 400, message: 'Invalid Telegram bot token' })
      }
      meResult = response.result
    } catch (err: unknown) {
      // Перебрасываем H3-ошибки (createError), остальное → 400
      if (err && typeof err === 'object' && 'statusCode' in err) throw err
      throw createError({ statusCode: 400, message: 'Failed to validate Telegram bot token' })
    }
    botUsername = meResult.username
    botName = meResult.first_name
  }

  const encryptedToken = encrypt(body.token, settings.internalApiSecret)

  const bot = await prisma.bot.create({
    data: {
      platform: body.platform,
      token: encryptedToken,
      botUsername,
      botName,
      isActive: true,
    },
  })

  // Сигналим bot-процессу начать работу (fire-and-forget, не блокирует)
  const config = useRuntimeConfig()
  $fetch(`${config.botInternalUrl}/internal/bot/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${settings.internalApiSecret}` },
    body: { botId: bot.id },
  }).catch(() => {
    // Игнорируем: bot-процесс может быть ещё не готов
  })

  return { success: true, botId: bot.id, botUsername: botUsername ?? null }
})
