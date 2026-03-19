export default defineEventHandler(async () => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  return {
    timezone: settings.timezone,
    maxCorrelationWindowSec: settings.maxCorrelationWindowSec,
  }
})
