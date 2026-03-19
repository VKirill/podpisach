export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const query = getQuery(event)
  const fromDate = query.from
    ? new Date(String(query.from))
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const toDate = query.to ? new Date(String(query.to)) : new Date()

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date range' })
  }

  const channel = await prisma.channel.findUnique({ where: { id } })
  if (!channel) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  const [totalSubscribers, newSubscribers, unsubscribed] = await Promise.all([
    prisma.subscriber.count({
      where: { channelId: id, status: 'active' },
    }),
    prisma.subscriber.count({
      where: {
        channelId: id,
        subscribedAt: { gte: fromDate, lte: toDate },
      },
    }),
    prisma.subscriber.count({
      where: {
        channelId: id,
        status: 'left',
        leftAt: { gte: fromDate, lte: toDate },
      },
    }),
  ])

  // Топ источников: GROUP BY utmSource через Visit → Subscriber
  const topSourcesRaw = await prisma.$queryRaw<
    Array<{ utmSource: string | null; subscriber_count: bigint }>
  >`
    SELECT v."utmSource", COUNT(s.id) AS subscriber_count
    FROM "Subscriber" s
    LEFT JOIN "Visit" v ON v.id = s."visitId"
    WHERE s."channelId" = ${id}
      AND s."subscribedAt" >= ${fromDate}
      AND s."subscribedAt" <= ${toDate}
    GROUP BY v."utmSource"
    ORDER BY subscriber_count DESC
    LIMIT 10
  `

  return {
    totalSubscribers,
    newSubscribers,
    unsubscribed,
    topSources: topSourcesRaw.map((row) => ({
      source: row.utmSource ?? '(direct)',
      count: Number(row.subscriber_count),
    })),
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
  }
})
