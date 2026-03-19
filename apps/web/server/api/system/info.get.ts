export default defineEventHandler(async () => {
  const [channels, subscribers, links, dbSizeResult] = await Promise.all([
    prisma.channel.count({ where: { isActive: true } }),
    prisma.subscriber.count(),
    prisma.inviteLink.count(),
    prisma.$queryRaw<[{ size: bigint }]>`
      SELECT pg_database_size(current_database()) AS size
    `,
  ])

  const dbSizeBytes = Number(dbSizeResult[0]?.size ?? 0)

  return {
    version: '0.1.0',
    channels,
    subscribers,
    links,
    dbSize: dbSizeBytes,
  }
})
