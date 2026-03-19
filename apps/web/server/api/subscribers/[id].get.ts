export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid subscriber ID' })
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { id },
    include: {
      visit: {
        select: {
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          utmContent: true,
          utmTerm: true,
          yclid: true,
          gclid: true,
          referrer: true,
          pageUrl: true,
          createdAt: true,
        },
      },
      inviteLink: {
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          eventType: true,
          createdAt: true,
        },
      },
    },
  })

  if (!subscriber) {
    throw createError({ statusCode: 404, message: 'Subscriber not found' })
  }

  return subscriber
})
