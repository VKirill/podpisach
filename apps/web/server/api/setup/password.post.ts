import bcrypt from 'bcryptjs'
import { setupPasswordSchema } from '@ps/shared'

export default defineEventHandler(async (event) => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  if (settings.setupCompleted) {
    throw createError({ statusCode: 403, message: 'Setup already completed' })
  }

  const body = await validateBody(event, setupPasswordSchema)

  const hash = await bcrypt.hash(body.password, 12)

  await prisma.settings.update({
    where: { id: 1 },
    data: { adminPasswordHash: hash },
  })

  return { success: true }
})
