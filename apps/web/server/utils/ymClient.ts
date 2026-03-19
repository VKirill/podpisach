import { encrypt, decrypt } from '@op/shared'
import type { YandexMetrikaAccount } from '@prisma/client'

const YM_API_BASE = 'https://api-metrika.yandex.net/management/v1'
const YA_OAUTH_TOKEN_URL = 'https://oauth.yandex.ru/token'

interface YaTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface YmFetchOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

/**
 * Проверяет актуальность access token и при необходимости обновляет его через refresh_token.
 * Возвращает действующий access token в расшифрованном виде.
 */
export async function ensureValidToken(account: YandexMetrikaAccount): Promise<string> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } })
  if (!settings) {
    throw createError({ statusCode: 503, message: 'Settings not initialized' })
  }

  // Токен действителен — вернуть сразу
  if (account.accessToken && account.tokenExpiresAt && account.tokenExpiresAt > new Date()) {
    return decrypt(account.accessToken, settings.internalApiSecret)
  }

  if (!account.refreshToken) {
    throw createError({
      statusCode: 401,
      message: 'Yandex Metrika: no refresh token, please re-authorize',
    })
  }

  const clientSecret = decrypt(account.clientSecret, settings.internalApiSecret)
  const refreshToken = decrypt(account.refreshToken, settings.internalApiSecret)

  let tokenData: YaTokenResponse
  try {
    tokenData = await $fetch<YaTokenResponse>(YA_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: account.clientId,
        client_secret: clientSecret,
      }).toString(),
    })
  } catch {
    throw createError({ statusCode: 502, message: 'Failed to refresh Yandex OAuth token' })
  }

  await prisma.yandexMetrikaAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(tokenData.access_token, settings.internalApiSecret),
      refreshToken: encrypt(tokenData.refresh_token, settings.internalApiSecret),
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    },
  })

  return tokenData.access_token
}

/**
 * Обёртка для запросов к Яндекс Метрика Management API.
 * Базовый URL: https://api-metrika.yandex.net/management/v1/
 */
export async function ymApiFetch<T>(
  path: string,
  token: string,
  options: YmFetchOptions = {},
): Promise<T> {
  const { headers, ...rest } = options
  return $fetch<T>(`${YM_API_BASE}/${path}`, {
    ...rest,
    headers: {
      Authorization: `OAuth ${token}`,
      ...headers,
    },
  })
}

/**
 * Отправляет offline-конверсию в Яндекс Метрику через CSV-загрузку.
 * CSV-формат: Yclid,Target,DateTime
 */
export async function sendOfflineConversion(
  counterId: string,
  yclid: string,
  goalCondition: string,
  datetime: string,
  token: string,
): Promise<void> {
  const csv = `Yclid,Target,DateTime\n${yclid},${goalCondition},${datetime}`

  await $fetch(`${YM_API_BASE}/counter/${counterId}/offline_conversions/upload`, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${token}`,
      'Content-Type': 'text/csv',
    },
    body: csv,
  })
}
