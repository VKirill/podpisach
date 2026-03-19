export default defineEventHandler(async (event) => {
  const linkId = Number(getRouterParam(event, 'id'))
  if (!linkId || isNaN(linkId)) {
    throw createError({ statusCode: 400, message: 'Invalid link ID' })
  }

  const link = await prisma.inviteLink.findUnique({
    where: { id: linkId },
    select: { id: true, isRevoked: true },
  })
  if (!link) {
    throw createError({ statusCode: 404, message: 'Link not found' })
  }

  // Уже отозвана — ничего не делаем
  if (link.isRevoked) {
    return { success: true }
  }

  const settings = await prisma.settings.findFirst({
    where: { id: 1 },
    select: { internalApiSecret: true },
  })

  const config = useRuntimeConfig()

  try {
    await $fetch(`${config.botInternalUrl}/internal/link/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings?.internalApiSecret}` },
      body: { linkId },
    })
  } catch {
    // Если бот недоступен — помечаем как отозванную локально
    await prisma.inviteLink.update({
      where: { id: linkId },
      data: { isRevoked: true },
    })
  }

  return { success: true }
})
