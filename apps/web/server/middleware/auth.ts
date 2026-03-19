// Выполняется первым (алфавитно auth < internal)
// Пропускает публичные маршруты и /api/internal/* (проверяется в internal.ts)
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/setup/',
  '/api/track/',
  '/api/report/',
  '/api/internal/',
]

export default defineEventHandler(async (event) => {
  const path = event.path

  // Не-API маршруты (SSR страницы, ассеты) — пропускаем
  if (!path.startsWith('/api/')) return

  // Публичные API-маршруты — пропускаем
  for (const prefix of PUBLIC_PREFIXES) {
    if (path.startsWith(prefix)) return
  }

  // Защищённые API-маршруты — требуем сессию
  const authenticated = await verifySession(event)
  if (!authenticated) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})
