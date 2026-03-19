import { z } from 'zod'

const patchChannelSchema = z.object({
  linkTtlHours: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid channel ID' })
  }

  const body = await validateBody(event, patchChannelSchema)

  const existing = await prisma.channel.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Channel not found' })
  }

  return prisma.channel.update({
    where: { id },
    data: body,
    include: {
      bot: { select: { id: true, platform: true, botUsername: true, botName: true } },
      _count: { select: { subscribers: true, inviteLinks: true } },
    },
  })
})
