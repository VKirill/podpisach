export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const period = String(query.period ?? '7d')
  const channelId = query.channelId ? Number(query.channelId) : null

  if (!['7d', '30d', '90d'].includes(period)) {
    throw createError({ statusCode: 400, message: 'Invalid period. Use: 7d, 30d, 90d' })
  }

  if (channelId !== null && isNaN(channelId)) {
    throw createError({ statusCode: 400, message: 'Invalid channelId' })
  }

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  type ChartRow = { day: Date; eventType: string; cnt: bigint }

  const rows = await (channelId !== null
    ? prisma.$queryRaw<ChartRow[]>`
        SELECT
          DATE_TRUNC('day', se."createdAt") AS day,
          se."eventType",
          COUNT(se.id) AS cnt
        FROM "SubscriptionEvent" se
        INNER JOIN "Subscriber" s ON s.id = se."subscriberId"
        WHERE se."createdAt" >= ${fromDate}
          AND s."channelId" = ${channelId}
          AND se."eventType" IN ('joined', 'left')
        GROUP BY DATE_TRUNC('day', se."createdAt"), se."eventType"
        ORDER BY day ASC
      `
    : prisma.$queryRaw<ChartRow[]>`
        SELECT
          DATE_TRUNC('day', se."createdAt") AS day,
          se."eventType",
          COUNT(se.id) AS cnt
        FROM "SubscriptionEvent" se
        WHERE se."createdAt" >= ${fromDate}
          AND se."eventType" IN ('joined', 'left')
        GROUP BY DATE_TRUNC('day', se."createdAt"), se."eventType"
        ORDER BY day ASC
      `)

  // Собираем карту: isoDate → { joins, leaves }
  const map = new Map<string, { joins: number; leaves: number }>()
  for (const row of rows) {
    const key = new Date(row.day).toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, { joins: 0, leaves: 0 })
    const entry = map.get(key)!
    if (row.eventType === 'joined') entry.joins += Number(row.cnt)
    else entry.leaves += Number(row.cnt)
  }

  // Заполняем все дни в диапазоне
  const labels: string[] = []
  const joins: number[] = []
  const leaves: number[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const entry = map.get(key) ?? { joins: 0, leaves: 0 }
    labels.push(key)
    joins.push(entry.joins)
    leaves.push(entry.leaves)
  }

  return { labels, joins, leaves }
})
