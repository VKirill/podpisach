export default defineEventHandler(async () => {
  const bots = await prisma.bot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      platform: true,
      botUsername: true,
      botName: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return { bots }
})
