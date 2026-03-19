export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const skip = (page - 1) * limit

  const [channels, total] = await Promise.all([
    prisma.channel.findMany({
      skip,
      take: limit,
      where: { isActive: true },
      include: {
        bot: {
          select: { id: true, platform: true, botUsername: true, botName: true },
        },
        _count: {
          select: { subscribers: true, inviteLinks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.channel.count({ where: { isActive: true } }),
  ])

  return {
    channels,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
})
