import { z } from 'zod'

const querySchema = z.object({
  type: z.enum(['auto', 'manual', 'all']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export default defineEventHandler(async (event) => {
  const channelId = Number(getRouterParam(event, 'id'))
  if (!channelId || isNaN(channelId)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid query parameters' })
  }

  const { type, page, limit } = parsed.data
  const skip = (page - 1) * limit

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true },
  })
  if (!channel) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  const where = {
    channelId,
    ...(type !== 'all' && { type: type as 'auto' | 'manual' }),
  }

  const [items, total] = await Promise.all([
    prisma.inviteLink.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        name: true,
        type: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmContent: true,
        utmTerm: true,
        costAmount: true,
        costCurrency: true,
        clickCount: true,
        joinCount: true,
        isRevoked: true,
        expiresAt: true,
        createdAt: true,
        visit: {
          select: {
            id: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
          },
        },
      },
    }),
    prisma.inviteLink.count({ where }),
  ])

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  }
})
