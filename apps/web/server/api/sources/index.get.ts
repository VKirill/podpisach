export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const period = String(query.period ?? '30d')
  const channelId = query.channelId ? Number(query.channelId) : null

  if (!['7d', '30d', '90d', 'all'].includes(period)) {
    throw createError({ statusCode: 400, message: 'Invalid period. Use: 7d, 30d, 90d, all' })
  }

  if (channelId !== null && isNaN(channelId)) {
    throw createError({ statusCode: 400, message: 'Invalid channelId' })
  }

  type VisitRow = {
    source: string | null
    medium: string | null
    campaign: string | null
    visits: bigint
    subscribers: bigint
    conversion_pct: number | null
  }

  type CostRow = {
    utm_source: string | null
    total_cost: number | null
    cost_currency: string | null
    cost_per_subscriber: number | null
  }

  // --- Основной запрос: Visit LEFT JOIN Subscriber ---
  let visitRows: VisitRow[]

  if (period === 'all') {
    visitRows = await (channelId !== null
      ? prisma.$queryRaw<VisitRow[]>`
          SELECT
            v."utmSource"   AS source,
            v."utmMedium"   AS medium,
            v."utmCampaign" AS campaign,
            COUNT(DISTINCT v.id)::bigint AS visits,
            COUNT(DISTINCT s.id)::bigint AS subscribers,
            ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 1) AS conversion_pct
          FROM "Visit" v
          LEFT JOIN "Subscriber" s ON s."visitId" = v.id
          WHERE v."channelId" = ${channelId}
          GROUP BY v."utmSource", v."utmMedium", v."utmCampaign"
          ORDER BY subscribers DESC
        `
      : prisma.$queryRaw<VisitRow[]>`
          SELECT
            v."utmSource"   AS source,
            v."utmMedium"   AS medium,
            v."utmCampaign" AS campaign,
            COUNT(DISTINCT v.id)::bigint AS visits,
            COUNT(DISTINCT s.id)::bigint AS subscribers,
            ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 1) AS conversion_pct
          FROM "Visit" v
          LEFT JOIN "Subscriber" s ON s."visitId" = v.id
          GROUP BY v."utmSource", v."utmMedium", v."utmCampaign"
          ORDER BY subscribers DESC
        `)
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    visitRows = await (channelId !== null
      ? prisma.$queryRaw<VisitRow[]>`
          SELECT
            v."utmSource"   AS source,
            v."utmMedium"   AS medium,
            v."utmCampaign" AS campaign,
            COUNT(DISTINCT v.id)::bigint AS visits,
            COUNT(DISTINCT s.id)::bigint AS subscribers,
            ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 1) AS conversion_pct
          FROM "Visit" v
          LEFT JOIN "Subscriber" s ON s."visitId" = v.id
          WHERE v."channelId" = ${channelId}
            AND v."createdAt" >= ${fromDate}
          GROUP BY v."utmSource", v."utmMedium", v."utmCampaign"
          ORDER BY subscribers DESC
        `
      : prisma.$queryRaw<VisitRow[]>`
          SELECT
            v."utmSource"   AS source,
            v."utmMedium"   AS medium,
            v."utmCampaign" AS campaign,
            COUNT(DISTINCT v.id)::bigint AS visits,
            COUNT(DISTINCT s.id)::bigint AS subscribers,
            ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 1) AS conversion_pct
          FROM "Visit" v
          LEFT JOIN "Subscriber" s ON s."visitId" = v.id
          WHERE v."createdAt" >= ${fromDate}
          GROUP BY v."utmSource", v."utmMedium", v."utmCampaign"
          ORDER BY subscribers DESC
        `)
  }

  // --- Запрос затрат из ручных ссылок ---
  let costRows: CostRow[]

  if (channelId !== null) {
    costRows = await prisma.$queryRaw<CostRow[]>`
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
  } else {
    costRows = await prisma.$queryRaw<CostRow[]>`
      SELECT
        il."utmSource"                                                   AS utm_source,
        SUM(il."costAmount")                                             AS total_cost,
        il."costCurrency"                                                AS cost_currency,
        ROUND(SUM(il."costAmount") / NULLIF(SUM(il."joinCount"), 0), 2) AS cost_per_subscriber
      FROM "InviteLink" il
      WHERE il.type = 'manual'
        AND il."costAmount" IS NOT NULL
      GROUP BY il."utmSource", il."costCurrency"
    `
  }

  // --- Строим карту затрат по utmSource ---
  const costMap = new Map<string, { totalCost: number; costCurrency: string; costPerSubscriber: number | null }>()

  for (const row of costRows) {
    const key = row.utm_source ?? '(direct)'
    // Если уже есть запись для этого source — берём первую (мультивалюта редкость)
    if (!costMap.has(key)) {
      costMap.set(key, {
        totalCost: row.total_cost ?? 0,
        costCurrency: row.cost_currency ?? '',
        costPerSubscriber: row.cost_per_subscriber ?? null,
      })
    }
  }

  // --- Формируем итоговый ответ ---
  const sources = visitRows.map((row) => {
    const sourceKey = row.source ?? '(direct)'
    const cost = costMap.get(sourceKey)

    return {
      source: row.source ?? null,
      medium: row.medium ?? null,
      campaign: row.campaign ?? null,
      visits: Number(row.visits),
      subscribers: Number(row.subscribers),
      conversionPct: row.conversion_pct !== null ? Number(row.conversion_pct) : 0,
      totalCost: cost?.totalCost ?? null,
      costCurrency: cost?.costCurrency ?? null,
      costPerSubscriber: cost?.costPerSubscriber ?? null,
    }
  })

  return { sources }
})
