export default defineEventHandler(async () => {
  const integration = await prisma.integration.findUnique({
    where: { type: 'google_analytics' },
    select: {
      id: true,
      isActive: true,
      lastSyncAt: true,
      config: true,
      _count: { select: { conversions: true } },
    },
  })

  if (!integration) {
    return { configured: false, isActive: false, measurementId: null, conversionsCount: 0 }
  }

  const config = integration.config as { measurementId: string; apiSecret: string }

  return {
    configured: true,
    isActive: integration.isActive,
    measurementId: config.measurementId,
    lastSyncAt: integration.lastSyncAt,
    conversionsCount: integration._count.conversions,
  }
})
