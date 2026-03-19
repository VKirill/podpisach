import { ymCounterBindSchema, GOAL_DEFAULT_NAMES, GOAL_KEYS } from '@ps/shared'
import { ensureValidToken, ymApiFetch } from '~/server/utils/ymClient'

type GoalKey = typeof GOAL_KEYS[number]

interface YmGoalResponse {
  goal: { id: number }
}

// Соответствие GoalKey → condition для цели в Метрике
const GOAL_CONDITIONS: Record<GoalKey, string> = {
  op_visit: 'op_visit',
  op_click: 'op_click',
  op_subscribe: 'op_subscribe',
  op_unsubscribe: 'op_unsubscribe',
  op_resubscribe: 'op_resubscribe',
}

export default defineEventHandler(async (event) => {
  const channelId = Number(getRouterParam(event, 'id'))
  if (isNaN(channelId)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const body = await validateBody(event, ymCounterBindSchema)

  const channel = await prisma.channel.findUnique({ where: { id: channelId } })
  if (!channel) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  const counter = await prisma.yandexMetrikaCounter.findUnique({ where: { id: body.counterId } })
  if (!counter) {
    throw createError({ statusCode: 404, message: 'Counter not found' })
  }

  const account = await prisma.yandexMetrikaAccount.findFirst({ where: { id: 1 } })
  if (!account || !account.isConnected) {
    throw createError({ statusCode: 400, message: 'Яндекс Метрика не подключена' })
  }

  // Создаём ChannelCounter (или получаем существующий)
  const channelCounter = await prisma.channelCounter.upsert({
    where: { channelId_counterId: { channelId, counterId: body.counterId } },
    create: { channelId, counterId: body.counterId },
    update: {},
  })

  const token = await ensureValidToken(account)

  // Для каждой зарезервированной цели — создаём в Метрике и сохраняем в БД
  await Promise.all(
    GOAL_KEYS.map(async (goalKey) => {
      // Проверяем, не создана ли уже цель для этого channelCounter
      const existing = await prisma.channelGoalConfig.findUnique({
        where: { channelCounterId_goalKey: { channelCounterId: channelCounter.id, goalKey } },
      })
      if (existing?.yandexGoalId) return existing

      let yandexGoalId: string | undefined
      try {
        const res = await ymApiFetch<YmGoalResponse>(
          `counter/${counter.yandexCounterId}/goals`,
          token,
          {
            method: 'POST',
            body: {
              goal: {
                name: GOAL_DEFAULT_NAMES[goalKey] ?? goalKey,
                type: 'action',
                conditions: [{ type: 'exact', url: GOAL_CONDITIONS[goalKey] }],
              },
            },
          },
        )
        yandexGoalId = String(res.goal.id)
      } catch {
        // Если цель не создалась в Метрике — сохраняем без yandexGoalId
      }

      return prisma.channelGoalConfig.upsert({
        where: { channelCounterId_goalKey: { channelCounterId: channelCounter.id, goalKey } },
        create: { channelCounterId: channelCounter.id, goalKey, isEnabled: true, yandexGoalId },
        update: existing ? {} : { yandexGoalId },
      })
    }),
  )

  return prisma.channelCounter.findUnique({
    where: { id: channelCounter.id },
    include: { counter: true, goals: true },
  })
})
