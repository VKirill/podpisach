import { ensureValidToken, ymApiFetch } from '~/server/utils/ymClient'

interface YmCounter {
  id: number
  name: string
  site: string
}

interface YmCountersResponse {
  counters: YmCounter[]
}

export default defineEventHandler(async () => {
  const account = await prisma.yandexMetrikaAccount.findFirst({ where: { id: 1 } })
  if (!account || !account.isConnected) {
    throw createError({ statusCode: 400, message: 'Яндекс Метрика не подключена' })
  }

  const token = await ensureValidToken(account)
  const data = await ymApiFetch<YmCountersResponse>('counters', token)

  // Upsert каждого счётчика в БД
  const upserted = await Promise.all(
    data.counters.map((c) =>
      prisma.yandexMetrikaCounter.upsert({
        where: { accountId_yandexCounterId: { accountId: account.id, yandexCounterId: String(c.id) } },
        create: {
          accountId: account.id,
          yandexCounterId: String(c.id),
          counterName: c.name,
          counterSite: c.site,
        },
        update: {
          counterName: c.name,
          counterSite: c.site,
        },
      }),
    ),
  )

  return upserted
})
