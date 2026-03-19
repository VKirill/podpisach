export default defineEventHandler(async () => {
  const account = await prisma.yandexMetrikaAccount.findFirst({
    where: { id: 1 },
    include: { _count: { select: { counters: true } } },
  })

  if (!account) {
    return { configured: false, isConnected: false, yaLogin: null, countersCount: 0 }
  }

  return {
    configured: true,
    isConnected: account.isConnected,
    yaLogin: account.yaLogin,
    clientId: account.clientId,
    countersCount: account._count.counters,
  }
})
