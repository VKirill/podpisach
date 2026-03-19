// Admin: деактивировать публичный отчёт
export default defineEventHandler(async (event) => {
  const authenticated = await verifySession(event)
  if (!authenticated) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token required' })
  }

  const report = await prisma.publicReport.findUnique({
    where: { token },
    select: { id: true },
  })
  if (!report) {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  await prisma.publicReport.update({
    where: { token },
    data: { isActive: false },
  })

  return { success: true }
})
