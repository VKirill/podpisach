import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'op-session'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 дней

export async function createSession(event: H3Event): Promise<void> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }
  const token = jwt.sign({ admin: true }, settings.sessionSecret, { expiresIn: '7d' })
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: (process.env.NUXT_PUBLIC_APP_URL || '').startsWith('https'),
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function verifySession(event: H3Event): Promise<boolean> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return false
  try {
    const settings = await prisma.settings.findFirst({ where: { id: 1 } })
    if (!settings) return false
    jwt.verify(token, settings.sessionSecret)
    return true
  } catch {
    return false
  }
}

export function clearSession(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
