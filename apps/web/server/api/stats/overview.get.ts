export default defineEventHandler(async () => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [aggregation, newToday, leftToday, channels, topSourcesRaw] = await Promise.all([
    prisma.channel.aggregate({
      _sum: { subscriberCount: true },
      where: { isActive: true },
    }),
    prisma.subscriptionEvent.count({
      where: { eventType: 'joined', createdAt: { gte: todayStart } },
    }),
    prisma.subscriptionEvent.count({
      where: { eventType: 'left', createdAt: { gte: todayStart } },
    }),
    prisma.channel.count({
      where: { isActive: true },
    }),
    prisma.$queryRaw<Array<{ utmSource: string | null; utmMedium: string | null; cnt: bigint }>>`
      SELECT v."utmSource", v."utmMedium", COUNT(s.id) AS cnt
      FROM "Subscriber" s
      INNER JOIN "Visit" v ON v.id = s."visitId"
      WHERE s."visitId" IS NOT NULL
      GROUP BY v."utmSource", v."utmMedium"
      ORDER BY cnt DESC
      LIMIT 3
    `,
  ])

  return {
    totalSubscribers: aggregation._sum.subscriberCount ?? 0,
    newToday,
    leftToday,
    channels,
    topSources: topSourcesRaw.map((row: { utmSource: string | null; utmMedium: string | null; cnt: bigint }) => ({
      source: row.utmSource ?? '(direct)',
      medium: row.utmMedium ?? '',
      count: Number(row.cnt),
    })),
  }
})
