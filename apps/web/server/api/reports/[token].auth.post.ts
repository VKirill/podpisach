import bcrypt from 'bcryptjs'
import { reportPasswordSchema } from '@op/shared'

// PUBLIC: проверка пароля публичного отчёта + выдача cookie-сессии
// checkRateLimit — auto-imported from server/utils/rateLimiter by Nitro
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token required' })
  }

  // Rate limiting: 5 попыток за 5 минут (R5: защита от брутфорса)
  const allowed = checkRateLimit(`report-auth:${token}`, 5, 300)
  if (!allowed) {
    throw createError({ statusCode: 429, message: 'Слишком много попыток. Попробуйте через 5 минут.' })
  }

  const body = await validateBody(event, reportPasswordSchema)

  const report = await prisma.publicReport.findUnique({
    where: { token },
    select: { passwordHash: true, isActive: true },
  })

  if (!report || !report.isActive) {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  if (!report.passwordHash) {
    // Отчёт без пароля — cookie не нужна
    return { success: true }
  }

  const valid = await bcrypt.compare(body.password, report.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Неверный пароль' })
  }

  setCookie(event, `report-session-${token}`, '1', {
    maxAge: 86400,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  return { success: true }
})
