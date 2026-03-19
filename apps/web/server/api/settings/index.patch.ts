import { settingsSchema } from '@ps/shared'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, settingsSchema)

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  const updated = await prisma.settings.update({
    where: { id: 1 },
    data: body,
    select: {
      timezone: true,
      maxCorrelationWindowSec: true,
    },
  })

  return updated
})
