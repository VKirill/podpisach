// Admin: список публичных отчётов
export default defineEventHandler(async (event) => {
  const authenticated = await verifySession(event)
  if (!authenticated) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const reports = await prisma.publicReport.findMany({
    include: {
      channel: {
        select: { id: true, title: true, username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { reports }
})
