/**
 * Утилита сбора данных публичного отчёта.
 * Фильтрация по visibility выполняется СЕРВЕРНО — данные не утекают по сети.
 */

interface VisibilityOptions {
  showSubscriberNames: boolean
  showUtmDetails: boolean
  showCosts: boolean
}

interface SourceRow {
  source: string | null
  medium: string | null
  subscribers: bigint
  conversion_pct: number | null
}

interface CostRow {
  utm_source: string | null
  total_cost: number | null
  cost_currency: string | null
  cost_per_subscriber: number | null
}

interface ChartRow {
  day: Date
  eventType: string
  cnt: bigint
}

interface SubscriberRow {
  firstName: string | null
  lastName: string | null
  username: string | null
  subscribedAt: Date
  utmSource: string | null
  attributionConfidence: number
}

export async function getReportData(channelId: number, options: VisibilityOptions) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // --- Статистика ---
  const [totalSubscribers, newThisWeek, leftThisWeek] = await Promise.all([
    prisma.subscriber.count({ where: { channelId, status: 'active' } }),
    prisma.subscriber.count({ where: { channelId, subscribedAt: { gte: sevenDaysAgo } } }),
    prisma.subscriber.count({ where: { channelId, status: 'left', leftAt: { gte: sevenDaysAgo } } }),
  ])

  // --- График за 30 дней ---
  const chartRows = await prisma.$queryRaw<ChartRow[]>`
    SELECT
      DATE_TRUNC('day', se."createdAt") AS day,
      se."eventType",
      COUNT(se.id) AS cnt
    FROM "SubscriptionEvent" se
    INNER JOIN "Subscriber" s ON s.id = se."subscriberId"
    WHERE se."createdAt" >= ${thirtyDaysAgo}
      AND s."channelId" = ${channelId}
      AND se."eventType" IN ('joined', 'left')
    GROUP BY DATE_TRUNC('day', se."createdAt"), se."eventType"
    ORDER BY day ASC
  `

  const chartMap = new Map<string, { joins: number; leaves: number }>()
  for (const row of chartRows) {
    const key = new Date(row.day).toISOString().slice(0, 10)
    if (!chartMap.has(key)) chartMap.set(key, { joins: 0, leaves: 0 })
    const entry = chartMap.get(key)!
    if (row.eventType === 'joined') entry.joins += Number(row.cnt)
    else entry.leaves += Number(row.cnt)
  }

  const labels: string[] = []
  const joins: number[] = []
  const leaves: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    const entry = chartMap.get(key) ?? { joins: 0, leaves: 0 }
    labels.push(key)
    joins.push(entry.joins)
    leaves.push(entry.leaves)
  }

  // --- Источники (всегда включаем для базового отображения) ---
  const sourceRows = await prisma.$queryRaw<SourceRow[]>`
    SELECT
      v."utmSource"   AS source,
      v."utmMedium"   AS medium,
      COUNT(DISTINCT s.id)::bigint AS subscribers,
      ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 1) AS conversion_pct
    FROM "Visit" v
    LEFT JOIN "Subscriber" s ON s."visitId" = v.id
    WHERE v."channelId" = ${channelId}
    GROUP BY v."utmSource", v."utmMedium"
    ORDER BY subscribers DESC
    LIMIT 20
  `

  // --- Затраты (только если showCosts) ---
  let costMap = new Map<string, { totalCost: number; costCurrency: string; costPerSubscriber: number | null }>()

  if (options.showCosts) {
    const costRows = await prisma.$queryRaw<CostRow[]>`
      SELECT
        il."utmSource"                                                   AS utm_source,
        SUM(il."costAmount")                                             AS total_cost,
        il."costCurrency"                                                AS cost_currency,
        ROUND(SUM(il."costAmount") / NULLIF(SUM(il."joinCount"), 0), 2) AS cost_per_subscriber
      FROM "InviteLink" il
      WHERE il.type = 'manual'
        AND il."costAmount" IS NOT NULL
        AND il."channelId" = ${channelId}
      GROUP BY il."utmSource", il."costCurrency"
    `

    for (const row of costRows) {
      const key = row.utm_source ?? '(direct)'
      if (!costMap.has(key)) {
        costMap.set(key, {
          totalCost: row.total_cost ?? 0,
          costCurrency: row.cost_currency ?? '',
          costPerSubscriber: row.cost_per_subscriber ?? null,
        })
      }
    }
  }

  const sources = sourceRows.map((row) => {
    const sourceKey = row.source ?? '(direct)'
    const cost = options.showCosts ? costMap.get(sourceKey) : undefined

    const base = {
      source: options.showUtmDetails ? (row.source ?? null) : null,
      medium: options.showUtmDetails ? (row.medium ?? null) : null,
      subscribers: Number(row.subscribers),
      conversionPct: row.conversion_pct !== null ? Number(row.conversion_pct) : 0,
    }

    return options.showCosts && cost
      ? { ...base, totalCost: cost.totalCost, costCurrency: cost.costCurrency, costPerSubscriber: cost.costPerSubscriber }
      : base
  })

  // --- Подписчики (только если showSubscriberNames) ---
  let subscribers: Array<{
    name: string | null
    subscribedAt: string
    source: string | null
    confidence: number
  }> | undefined

  if (options.showSubscriberNames) {
    const rows = await prisma.$queryRaw<SubscriberRow[]>`
      SELECT
        s."firstName",
        s."lastName",
        s.username,
        s."subscribedAt",
        v."utmSource",
        s."attributionConfidence"
      FROM "Subscriber" s
      LEFT JOIN "Visit" v ON v.id = s."visitId"
      WHERE s."channelId" = ${channelId}
        AND s.status = 'active'
      ORDER BY s."subscribedAt" DESC
      LIMIT 200
    `

    subscribers = rows.map((row) => {
      const nameParts = [row.firstName, row.lastName].filter(Boolean)
      const name = nameParts.length > 0 ? nameParts.join(' ') : (row.username ?? null)
      return {
        name,
        subscribedAt: row.subscribedAt.toISOString(),
        source: options.showUtmDetails ? (row.utmSource ?? null) : null,
        confidence: row.attributionConfidence,
      }
    })
  }

  return {
    stats: { totalSubscribers, newThisWeek, leftThisWeek },
    chart: { labels, joins, leaves },
    sources,
    ...(subscribers !== undefined ? { subscribers } : {}),
  }
}
