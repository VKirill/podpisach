// In-memory rate limiter (MVP). Для production рекомендуется Redis.
const attempts = new Map<string, { count: number; resetAt: number }>()

/**
 * Проверяет лимит попыток для ключа.
 * @returns true если попытка разрешена, false если лимит исчерпан
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowSec = 300,
): boolean {
  const now = Date.now()

  // Очищаем устаревшие записи (ленивая очистка)
  for (const [k, v] of Array.from(attempts.entries())) {
    if (v.resetAt < now) attempts.delete(k)
  }

  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowSec * 1000 })
    return true
  }

  if (entry.count >= maxAttempts) return false

  entry.count++
  return true
}
