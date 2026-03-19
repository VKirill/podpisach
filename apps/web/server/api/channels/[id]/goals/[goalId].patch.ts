import { ymGoalPatchSchema } from '@ps/shared'
import { ensureValidToken, ymApiFetch } from '~/server/utils/ymClient'

export default defineEventHandler(async (event) => {
  const channelId = Number(getRouterParam(event, 'id'))
  const goalConfigId = Number(getRouterParam(event, 'goalId'))
  if (isNaN(channelId) || isNaN(goalConfigId)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const body = await validateBody(event, ymGoalPatchSchema)

  // Загружаем конфигурацию цели с нужными связями
  const goalConfig = await prisma.channelGoalConfig.findUnique({
    where: { id: goalConfigId },
    include: {
      channelCounter: {
        include: { counter: true },
      },
    },
  })

  if (!goalConfig || goalConfig.channelCounter.channelId !== channelId) {
    throw createError({ statusCode: 404, message: 'Goal config not found' })
  }

  // Если изменилось имя и есть yandexGoalId — обновляем в Метрике
  const nameChanged = body.customName !== undefined && body.customName !== goalConfig.customName
  if (nameChanged && goalConfig.yandexGoalId) {
    const account = await prisma.yandexMetrikaAccount.findFirst({ where: { id: 1 } })
    if (account?.isConnected) {
      try {
        const token = await ensureValidToken(account)
        const { yandexCounterId } = goalConfig.channelCounter.counter
        await ymApiFetch(
          `counter/${yandexCounterId}/goal/${goalConfig.yandexGoalId}`,
          token,
          {
            method: 'PUT',
            body: {
              goal: {
                id: Number(goalConfig.yandexGoalId),
                name: body.customName,
              },
            },
          },
        )
      } catch {
        // Ошибка синхронизации в Метрике не блокирует обновление в БД
      }
    }
  }

  return prisma.channelGoalConfig.update({
    where: { id: goalConfigId },
    data: {
      ...(body.customName !== undefined && { customName: body.customName }),
      isEnabled: body.isEnabled,
    },
  })
})
