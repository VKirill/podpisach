export default defineEventHandler(async (event) => {
  const channelId = Number(getRouterParam(event, 'id'))
  if (isNaN(channelId)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const channelCounter = await prisma.channelCounter.findFirst({
    where: { channelId },
    include: {
      counter: true,
      goals: { orderBy: { goalKey: 'asc' } },
    },
  })

  if (!channelCounter) {
    return { counter: null, goals: [] }
  }

  return {
    counter: channelCounter.counter,
    goals: channelCounter.goals,
  }
})
