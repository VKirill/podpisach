export default defineEventHandler(async () => {
  const integration = await prisma.integration.findUnique({
    where: { type: 'google_analytics' },
    select: { id: true },
  })

  if (!integration) {
    throw createError({ statusCode: 404, message: 'Интеграция Google Analytics не найдена' })
  }

  await prisma.integration.delete({
    where: { type: 'google_analytics' },
  })

  return { success: true }
})
