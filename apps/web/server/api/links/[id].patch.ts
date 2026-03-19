import { updateLinkSchema } from '@op/shared/validation'

export default defineEventHandler(async (event) => {
  const linkId = Number(getRouterParam(event, 'id'))
  if (!linkId || isNaN(linkId)) {
    throw createError({ statusCode: 400, message: 'Invalid link ID' })
  }

  const body = await validateBody(event, updateLinkSchema)

  const link = await prisma.inviteLink.findUnique({
    where: { id: linkId },
    select: { id: true },
  })
  if (!link) {
    throw createError({ statusCode: 404, message: 'Link not found' })
  }

  const updated = await prisma.inviteLink.update({
    where: { id: linkId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.costAmount !== undefined && { costAmount: body.costAmount }),
      ...(body.costCurrency !== undefined && { costCurrency: body.costCurrency }),
    },
    select: {
      id: true,
      name: true,
      costAmount: true,
      costCurrency: true,
    },
  })

  return updated
})
