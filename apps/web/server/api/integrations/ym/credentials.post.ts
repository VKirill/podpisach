import { ymCredentialsSchema } from '@ps/shared'
import { encrypt } from '@ps/shared'

export default defineEventHandler(async (event) => {
  const body = await validateBody(event, ymCredentialsSchema)

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  const account = await prisma.yandexMetrikaAccount.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      clientId: body.clientId,
      clientSecret: encrypt(body.clientSecret, settings.internalApiSecret),
    },
    update: {
      clientId: body.clientId,
      clientSecret: encrypt(body.clientSecret, settings.internalApiSecret),
      // При смене ключей — сбрасываем токены и статус подключения
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isConnected: false,
      yaLogin: null,
    },
  })

  return { id: account.id, clientId: account.clientId, isConnected: account.isConnected }
})
