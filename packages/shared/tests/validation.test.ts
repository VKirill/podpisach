import {
  trackPayloadSchema,
  loginSchema,
  setupBotSchema,
  setupPasswordSchema,
} from '../src/validation.ts'

describe('trackPayloadSchema', () => {
  test('valid payload with required fields only', () => {
    const result = trackPayloadSchema.safeParse({ channelId: 1 })
    expect(result.success).toBe(true)
  })

  test('valid payload with all UTM fields', () => {
    const result = trackPayloadSchema.safeParse({
      channelId: 1,
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer-sale',
      utmContent: 'banner',
      utmTerm: 'buy',
    })
    expect(result.success).toBe(true)
  })

  test('rejects negative channelId', () => {
    const result = trackPayloadSchema.safeParse({ channelId: -1 })
    expect(result.success).toBe(false)
  })

  test('rejects zero channelId', () => {
    const result = trackPayloadSchema.safeParse({ channelId: 0 })
    expect(result.success).toBe(false)
  })

  test('rejects UTM source longer than 500 chars', () => {
    const result = trackPayloadSchema.safeParse({
      channelId: 1,
      utmSource: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  test('accepts UTM source exactly 500 chars', () => {
    const result = trackPayloadSchema.safeParse({
      channelId: 1,
      utmSource: 'a'.repeat(500),
    })
    expect(result.success).toBe(true)
  })

  test('platform defaults to telegram when not provided', () => {
    const result = trackPayloadSchema.safeParse({ channelId: 1 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platform).toBe('telegram')
    }
  })

  test('accepts max platform', () => {
    const result = trackPayloadSchema.safeParse({ channelId: 1, platform: 'max' })
    expect(result.success).toBe(true)
  })

  test('rejects unknown platform', () => {
    const result = trackPayloadSchema.safeParse({ channelId: 1, platform: 'vk' })
    expect(result.success).toBe(false)
  })

  test('optional fields can be omitted', () => {
    const result = trackPayloadSchema.safeParse({
      channelId: 42,
      // no utm, yclid, gclid, referrer, url, fingerprint
    })
    expect(result.success).toBe(true)
  })
})

describe('loginSchema', () => {
  test('valid password', () => {
    const result = loginSchema.safeParse({ password: 'mypassword' })
    expect(result.success).toBe(true)
  })

  test('rejects empty password', () => {
    const result = loginSchema.safeParse({ password: '' })
    expect(result.success).toBe(false)
  })

  test('rejects missing password', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('setupPasswordSchema', () => {
  test('valid password with at least 8 chars', () => {
    const result = setupPasswordSchema.safeParse({ password: 'secure123' })
    expect(result.success).toBe(true)
  })

  test('rejects password shorter than 8 chars', () => {
    const result = setupPasswordSchema.safeParse({ password: 'short' })
    expect(result.success).toBe(false)
  })

  test('rejects empty password', () => {
    const result = setupPasswordSchema.safeParse({ password: '' })
    expect(result.success).toBe(false)
  })
})

describe('setupBotSchema', () => {
  test('valid telegram bot token', () => {
    const result = setupBotSchema.safeParse({
      platform: 'telegram',
      token: '1234567890:ABCDEFghijklmnopqrstuvwxyz',
    })
    expect(result.success).toBe(true)
  })

  test('rejects token shorter than 10 chars', () => {
    const result = setupBotSchema.safeParse({
      platform: 'telegram',
      token: 'short',
    })
    expect(result.success).toBe(false)
  })

  test('rejects invalid platform', () => {
    const result = setupBotSchema.safeParse({
      platform: 'discord',
      token: '1234567890:ABCDEFghijklmnop',
    })
    expect(result.success).toBe(false)
  })

  test('accepts max platform', () => {
    const result = setupBotSchema.safeParse({
      platform: 'max',
      token: '1234567890:ABCDEFghijklmnopqrstuvwxyz',
    })
    expect(result.success).toBe(true)
  })

  test('rejects missing token', () => {
    const result = setupBotSchema.safeParse({ platform: 'telegram' })
    expect(result.success).toBe(false)
  })
})
