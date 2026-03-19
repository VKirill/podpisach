// Публичный эндпоинт: возвращает состояние wizard для определения текущего шага.
// Намеренно не блокируется по setupCompleted — фронт должен видеть состояние.
export default defineEventHandler(async () => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  const [telegramBotCount, channelCount] = await Promise.all([
    prisma.bot.count({ where: { platform: 'telegram' } }),
    prisma.channel.count(),
  ])

  return {
    setupCompleted: settings.setupCompleted,
    hasPassword: !!settings.adminPasswordHash,
    hasTelegramBot: telegramBotCount > 0,
    hasChannel: channelCount > 0,
  }
})
