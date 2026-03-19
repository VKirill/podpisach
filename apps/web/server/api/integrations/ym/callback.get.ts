import { encrypt } from '@ps/shared'

interface YaTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface YaLoginResponse {
  login: string
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string

  // Валидация CSRF state
  const savedState = getCookie(event, 'ym-oauth-state')
  if (!savedState || savedState !== state) {
    throw createError({ statusCode: 400, message: 'Invalid OAuth state (CSRF protection)' })
  }
  deleteCookie(event, 'ym-oauth-state')

  if (!code) {
    throw createError({ statusCode: 400, message: 'Не получен код авторизации' })
  }

  const account = await prisma.yandexMetrikaAccount.findFirst({ where: { id: 1 } })
  if (!account) {
    throw createError({ statusCode: 400, message: 'OAuth-ключи не настроены' })
  }

  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  const config = useRuntimeConfig()
  const redirectUri = `${config.public.appUrl}/api/integrations/ym/callback`
  const { decrypt } = await import('@ps/shared')

  // Обмен code на токены
  let tokenData: YaTokenResponse
  try {
    tokenData = await $fetch<YaTokenResponse>('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: account.clientId,
        client_secret: decrypt(account.clientSecret, settings.internalApiSecret),
      }).toString(),
    })
  } catch {
    throw createError({ statusCode: 502, message: 'Ошибка обмена кода на токены Яндекс' })
  }

  // Получаем логин пользователя Яндекса
  let yaLogin: string | undefined
  try {
    const info = await $fetch<YaLoginResponse>('https://login.yandex.ru/info', {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    })
    yaLogin = info.login
  } catch {
    // не критично — продолжаем без логина
  }

  await prisma.yandexMetrikaAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(tokenData.access_token, settings.internalApiSecret),
      refreshToken: encrypt(tokenData.refresh_token, settings.internalApiSecret),
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      isConnected: true,
      yaLogin: yaLogin ?? null,
    },
  })

  return sendRedirect(event, '/integrations')
})
