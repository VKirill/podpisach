export default defineEventHandler(async (event) => {
  const channelId = Number(getRouterParam(event, 'id'))
  if (!channelId || isNaN(channelId)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 50))
  const skip = (page - 1) * limit
  const status = String(query.status || 'all')
  const search = query.search ? String(query.search).trim() : undefined
  const source = query.source ? String(query.source).trim() : undefined

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true },
  })
  if (!channel) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  const where: Parameters<typeof prisma.subscriber.findMany>[0]['where'] = {
    channelId,
    ...(status !== 'all' && { status: status as 'active' | 'left' | 'kicked' | 'banned' }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(source && { visit: { utmSource: source } }),
  }

  const [items, total, visitRows] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      skip,
      take: limit,
      orderBy: { subscribedAt: 'desc' },
      select: {
        id: true,
        platform: true,
        platformUserId: true,
        firstName: true,
        lastName: true,
        username: true,
        attributionConfidence: true,
        status: true,
        subscribedAt: true,
        leftAt: true,
        visit: {
          select: {
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
          },
        },
        inviteLink: {
          select: {
            id: true,
            name: true,
            url: true,
            type: true,
          },
        },
      },
    }),
    prisma.subscriber.count({ where }),
    prisma.visit.findMany({
      where: { channelId },
      select: { utmSource: true },
      distinct: ['utmSource'],
    }),
  ])

  const sources = visitRows
    .map((v) => v.utmSource ?? null)
    .filter((s): s is string => s !== null && s !== '')

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    sources,
  }
})
