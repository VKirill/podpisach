// Публичный эндпоинт: возвращает состояние wizard для определения текущего шага.
// Намеренно не блокируется по setupCompleted — фронт должен видеть состояние.
export default defineEventHandler(async () => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  const [telegramBot, channel] = await Promise.all([
    prisma.bot.findFirst({
      where: { platform: 'telegram' },
      select: { botUsername: true },
    }),
    prisma.channel.findFirst({
      select: { title: true },
    }),
  ])

  return {
    setupCompleted: settings.setupCompleted,
    hasPassword: !!settings.adminPasswordHash,
    hasTelegramBot: telegramBot !== null,
    hasChannel: channel !== null,
    botUsername: telegramBot?.botUsername ?? null,
    channelTitle: channel?.title ?? null,
  }
})
