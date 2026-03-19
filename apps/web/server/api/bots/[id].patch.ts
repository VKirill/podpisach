export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')
  const id = Number(idParam)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid bot id' })
  }

  const bot = await prisma.bot.findUnique({ where: { id } })
  if (!bot) {
    throw createError({ statusCode: 404, message: 'Bot not found' })
  }

  const updated = await prisma.bot.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      platform: true,
      botUsername: true,
      botName: true,
      isActive: true,
    },
  })

  return { bot: updated }
})
