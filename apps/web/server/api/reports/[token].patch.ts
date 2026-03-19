import bcrypt from 'bcryptjs'
import { updateReportSchema } from '@op/shared'

// Admin: обновить настройки отчёта
export default defineEventHandler(async (event) => {
  const authenticated = await verifySession(event)
  if (!authenticated) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token required' })
  }

  const body = await validateBody(event, updateReportSchema)

  const existing = await prisma.publicReport.findUnique({
    where: { token },
    select: { id: true },
  })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  // Хешируем пароль если передан строкой, сбрасываем если null
  let passwordHash: string | null | undefined
  if (body.password === null) {
    passwordHash = null
  } else if (typeof body.password === 'string') {
    passwordHash = await bcrypt.hash(body.password, 12)
  }

  const updated = await prisma.publicReport.update({
    where: { token },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(passwordHash !== undefined && { passwordHash }),
      ...(body.showSubscriberNames !== undefined && { showSubscriberNames: body.showSubscriberNames }),
      ...(body.showUtmDetails !== undefined && { showUtmDetails: body.showUtmDetails }),
      ...(body.showCosts !== undefined && { showCosts: body.showCosts }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })

  return { report: updated }
})
