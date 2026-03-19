import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry } from '../../src/utils/retry.js'

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('возвращает результат при успехе с первой попытки', async () => {
    const fn = vi.fn().mockResolvedValue('ok')

    const result = await withRetry(fn)

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('повторяет и возвращает результат после 2 неудач', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    // Запускаем параллельно: промис + продвижение таймеров
    const [result] = await Promise.all([
      withRetry(fn, { delayMs: 100 }),
      vi.runAllTimersAsync(),
    ])

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('бросает ошибку если все попытки неудачны', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await Promise.all([
      expect(withRetry(fn, { maxRetries: 2, delayMs: 100 })).rejects.toThrow('always fails'),
      vi.runAllTimersAsync(),
    ])

    // 1 initial + 2 retries = 3 вызова
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('использует exponential backoff: задержки 1x, 2x, 4x delayMs', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const fn = vi.fn().mockRejectedValue(new Error('err'))

    await Promise.all([
      withRetry(fn, { maxRetries: 3, delayMs: 1000 }).catch(() => {}),
      vi.runAllTimersAsync(),
    ])

    // attempt 0 → delay 1000ms, attempt 1 → 2000ms, attempt 2 → 4000ms
    const delays = setTimeoutSpy.mock.calls.map((args) => args[1])
    expect(delays).toContain(1000)
    expect(delays).toContain(2000)
    expect(delays).toContain(4000)
  })

  it('использует дефолтные значения maxRetries=3, delayMs=1000', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))

    await Promise.all([
      expect(withRetry(fn)).rejects.toThrow('fail'),
      vi.runAllTimersAsync(),
    ])

    // 1 + 3 retries = 4 вызова
    expect(fn).toHaveBeenCalledTimes(4)
  })
})
