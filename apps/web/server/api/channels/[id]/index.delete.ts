export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const existing = await prisma.channel.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  await prisma.channel.update({
    where: { id },
    data: { isActive: false },
  })

  return { success: true }
})
