export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      bot: { select: { id: true, platform: true, botUsername: true, botName: true } },
      _count: { select: { subscribers: true, inviteLinks: true } },
    },
  })

  if (!channel) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  return channel
})
