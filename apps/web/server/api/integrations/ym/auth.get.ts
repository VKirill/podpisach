import { randomUUID } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const account = await prisma.yandexMetrikaAccount.findFirst({ where: { id: 1 } })
  if (!account) {
    throw createError({ statusCode: 400, message: 'Сначала сохраните client_id и client_secret' })
  }

  const state = randomUUID()
  // Сохраняем state в cookie для CSRF-защиты (10 минут)
  setCookie(event, 'ym-oauth-state', state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: '/',
  })

  const config = useRuntimeConfig()
  const redirectUri = `${config.public.appUrl}/api/integrations/ym/callback`

  const params = new URLSearchParams({
    client_id: account.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'metrika:read metrika:write',
    state,
  })

  return sendRedirect(event, `https://oauth.yandex.ru/authorize?${params.toString()}`)
})
