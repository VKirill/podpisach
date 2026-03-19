import { z } from 'zod'

const querySchema = z.object({
  channelId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'left', 'kicked', 'banned']).optional(),
})

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function csvRow(fields: (string | null | undefined)[]): string {
  return fields.map(csvEscape).join(',')
}

export default defineEventHandler(async (event) => {
  const rawQuery = getQuery(event)
  const parsed = querySchema.safeParse(rawQuery)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'channelId обязателен и должен быть числом' })
  }

  const { channelId, status } = parsed.data

  const where = {
    channelId,
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
  })

  const date = new Date().toISOString().slice(0, 10)
  const filename = `subscribers-${channelId}-${date}.csv`

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
