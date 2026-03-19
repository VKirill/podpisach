import bcrypt from 'bcryptjs'
import { loginSchema } from '@op/shared'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, loginSchema)

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  if (!settings.setupCompleted) {
    throw createError({ statusCode: 403, message: 'Setup not completed' })
  }

  if (!settings.adminPasswordHash) {
    throw createError({ statusCode: 403, message: 'Admin password not set' })
  }

  const valid = await bcrypt.compare(body.password, settings.adminPasswordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid password' })
  }

  await createSession(event)

  return { success: true }
})
