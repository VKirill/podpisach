import { createLinkSchema } from '@op/shared/validation'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, createLinkSchema)

  const channel = await prisma.channel.findUnique({
    where: { id: body.channelId },
    select: { id: true, isActive: true, platform: true },
  })
  if (!channel || !channel.isActive) {
    throw createError({ statusCode: 404, message: 'Channel not found or inactive' })
  }

  // Ручные ссылки поддерживаются только для Telegram
  if (channel.platform !== 'telegram') {
    throw createError({
      statusCode: 400,
      message: 'Manual links are only supported for Telegram channels',
    })
  }

  const settings = await prisma.settings.findFirst({
    where: { id: 1 },
    select: { internalApiSecret: true },
  })

  const config = useRuntimeConfig()

  try {
    const response = await $fetch<{ inviteUrl: string; linkId: number }>(
      `${config.botInternalUrl}/internal/link/create`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings?.internalApiSecret}` },
        body: {
          channelId: body.channelId,
          name: body.name,
          utmSource: body.utmSource,
          utmMedium: body.utmMedium,
          utmCampaign: body.utmCampaign,
          utmContent: body.utmContent,
          utmTerm: body.utmTerm,
          costAmount: body.costAmount,
          costCurrency: body.costCurrency,
        },
      },
    )

    return {
      url: response.inviteUrl,
      linkId: response.linkId,
    }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 429) {
      throw createError({ statusCode: 429, message: 'Rate limit: too many active invite links' })
    }
    if (statusCode === 503) {
      throw createError({ statusCode: 503, message: 'Bot is not running' })
    }
    throw createError({ statusCode: 502, message: 'Failed to create invite link' })
  }
})
