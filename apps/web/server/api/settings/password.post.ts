import bcrypt from 'bcryptjs'
import { changePasswordSchema } from '@ps/shared'

export default defineEventHandler(async (event) => {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })

  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  // Нельзя сменить пароль, если он ещё не был установлен
  if (!settings.adminPasswordHash) {
    throw createError({ statusCode: 403, message: 'Password not set. Use setup wizard.' })
  }

  const body = await validateBody(event, changePasswordSchema)

  const isValid = await bcrypt.compare(body.currentPassword, settings.adminPasswordHash)
  if (!isValid) {
    throw createError({ statusCode: 401, message: 'Текущий пароль неверен' })
  }

  const newHash = await bcrypt.hash(body.newPassword, 12)

  await prisma.settings.update({
    where: { id: 1 },
    data: { adminPasswordHash: newHash },
  })

  return { success: true }
})
