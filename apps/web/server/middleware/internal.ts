// Выполняется вторым (алфавитно auth < internal)
// Проверяет Bearer-токен ТОЛЬКО для /api/internal/* маршрутов
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/internal/')) return

  const authHeader = getHeader(event, 'authorization')
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })

  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  if (authHeader !== `Bearer ${settings.internalApiSecret}`) {
    throw createError({ statusCode: 401, message: 'Invalid internal API secret' })
  }
})
