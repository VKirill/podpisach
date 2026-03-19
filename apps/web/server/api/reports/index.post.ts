import bcrypt from 'bcryptjs'
import { createReportSchema } from '@ps/shared'

// Admin: создать публичный отчёт
export default defineEventHandler(async (event) => {
  const authenticated = await verifySession(event)
  if (!authenticated) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await validateBody(event, createReportSchema)

  const channel = await prisma.channel.findUnique({ where: { id: body.channelId } })
  if (!channel) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : null

  const report = await prisma.publicReport.create({
    data: {
      channelId: body.channelId,
      name: body.name,
      passwordHash,
      showSubscriberNames: body.showSubscriberNames ?? false,
      showUtmDetails: body.showUtmDetails ?? true,
      showCosts: body.showCosts ?? true,
    },
    select: { token: true },
  })

  return {
    token: report.token,
    url: `/r/${report.token}`,
  }
})
