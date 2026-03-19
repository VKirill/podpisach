export default defineEventHandler(async (event) => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  if (settings.setupCompleted) {
    throw createError({ statusCode: 403, message: 'Setup already completed' })
  }

  // Проверяем все предусловия перед финализацией
  const hasPassword = !!settings.adminPasswordHash
  if (!hasPassword) {
    throw createError({ statusCode: 400, message: 'Admin password not set' })
  }

  const [telegramBotCount, channelCount] = await Promise.all([
    prisma.bot.count({ where: { platform: 'telegram' } }),
    prisma.channel.count(),
  ])

  if (telegramBotCount === 0) {
    throw createError({ statusCode: 400, message: 'Telegram bot not configured' })
  }

  if (channelCount === 0) {
    throw createError({ statusCode: 400, message: 'No channel configured' })
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: { setupCompleted: true },
  })

  await createSession(event)

  return { success: true }
})
