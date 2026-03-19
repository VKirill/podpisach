import { z } from 'zod'

const querySchema = z.object({
  // channelId опционален: если не указан — экспорт всех подписчиков
  channelId: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'left', 'kicked', 'banned']).optional(),
})

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // FIX: formula injection protection — prefix dangerous leading chars with single quote
  const FORMULA_STARTERS = ['=', '+', '-', '@', '\t', '\r']
  const safe = FORMULA_STARTERS.some(c => str.startsWith(c)) ? "'" + str : str
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return '"' + safe.replace(/"/g, '""') + '"'
  }
  return safe
}

function csvRow(fields: (string | null | undefined)[]): string {
  return fields.map(csvEscape).join(',')
}

export default defineEventHandler(async (event) => {
  const rawQuery = getQuery(event)
  const parsed = querySchema.safeParse(rawQuery)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Неверные параметры запроса' })
  }

  const { channelId, status } = parsed.data

  const where = {
    ...(channelId ? { channelId } : {}),
    ...(status ? { status } : {}),
  }

  const subscribers = await prisma.subscriber.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      platform: true,
      attributionConfidence: true,
      status: true,
      subscribedAt: true,
      visit: {
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      },
    },
    orderBy: { subscribedAt: 'desc' },
    take: 50_000,
  })

  const date = new Date().toISOString().slice(0, 10)
  const filename = channelId
    ? `subscribers-${channelId}-${date}.csv`
    : `subscribers-all-${date}.csv`

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })

  const headers = ['ID', 'Имя', 'Username', 'Платформа', 'Источник', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'Дата подписки', 'Статус', 'Уверенность']

  const rows = subscribers.map((s) => {
    const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ') || ''
    const source = s.visit?.utmSource ?? ''
    const confidence = (s.attributionConfidence * 100).toFixed(0) + '%'
    const subscribedAt = new Date(s.subscribedAt).toISOString().replace('T', ' ').slice(0, 19)

    return csvRow([
      String(s.id),
      fullName,
      s.username ?? '',
      s.platform,
      source || '(прямой)',
      s.visit?.utmSource ?? '',
      s.visit?.utmMedium ?? '',
      s.visit?.utmCampaign ?? '',
      subscribedAt,
      s.status,
      confidence,
    ])
  })

  return '\uFEFF' + headers.join(',') + '\r\n' + rows.join('\r\n')
})
