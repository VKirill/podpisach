export default defineEventHandler(async (event) => {
  const authenticated = await verifySession(event)

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  const setupCompleted = settings?.setupCompleted ?? false

  return { authenticated, setupCompleted }
})
