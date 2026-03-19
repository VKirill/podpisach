export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit ?? 20), 100)

  if (isNaN(limit) || limit < 1) {
    throw createError({ statusCode: 400, message: 'Invalid limit' })
  }

  type EventRow = {
    type: string
    subscriberName: string | null
    channelTitle: string
    source: string | null
    createdAt: Date
  }

  const events = await prisma.$queryRaw<EventRow[]>`
    SELECT
      se."eventType" AS type,
      COALESCE(s."firstName", s."username", s."platformUserId") AS "subscriberName",
      c.title AS "channelTitle",
      v."utmSource" AS source,
      se."createdAt"
    FROM "SubscriptionEvent" se
    INNER JOIN "Subscriber" s ON s.id = se."subscriberId"
    INNER JOIN "Channel" c ON c.id = s."channelId"
    LEFT JOIN "Visit" v ON v.id = s."visitId"
    ORDER BY se."createdAt" DESC
    LIMIT ${limit}
  `

  return {
    events: events.map((e: EventRow) => ({
      type: e.type,
      subscriberName: e.subscriberName ?? 'Пользователь',
      channelTitle: e.channelTitle,
      source: e.source ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  }
})
