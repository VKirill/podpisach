import {
  CONFIDENCE,
  MAX_LINKS_PER_MINUTE,
  CURRENCIES,
  DEFAULT_LINK_TTL_HOURS,
  DEFAULT_CORRELATION_WINDOW_SEC,
  MAX_UTM_LENGTH,
  MAX_URL_LENGTH,
  GOAL_KEYS,
  PLATFORMS,
} from '../src/constants.ts'

describe('CONFIDENCE', () => {
  test('EXACT_TG is 1.0', () => {
    expect(CONFIDENCE.EXACT_TG).toBe(1.0)
  })

  test('HIGH_TG is 0.95', () => {
    expect(CONFIDENCE.HIGH_TG).toBe(0.95)
  })

  test('MEDIUM_MAX is 0.80', () => {
    expect(CONFIDENCE.MEDIUM_MAX).toBe(0.80)
  })

  test('LOW_MAX is 0.70', () => {
    expect(CONFIDENCE.LOW_MAX).toBe(0.70)
  })

  test('confidence values are in descending order', () => {
    expect(CONFIDENCE.EXACT_TG).toBeGreaterThan(CONFIDENCE.HIGH_TG)
    expect(CONFIDENCE.HIGH_TG).toBeGreaterThan(CONFIDENCE.MEDIUM_MAX)
    expect(CONFIDENCE.MEDIUM_MAX).toBeGreaterThan(CONFIDENCE.LOW_MAX)
  })
})

describe('Rate limits', () => {
  test('MAX_LINKS_PER_MINUTE is 20', () => {
    expect(MAX_LINKS_PER_MINUTE).toBe(20)
  })
})

describe('CURRENCIES', () => {
  test('contains RUB', () => {
    expect(CURRENCIES).toContain('RUB')
  })

  test('contains EUR', () => {
    expect(CURRENCIES).toContain('EUR')
  })

  test('contains USD', () => {
    expect(CURRENCIES).toContain('USD')
  })

  test('contains TON', () => {
    expect(CURRENCIES).toContain('TON')
  })

  test('has exactly 4 currencies', () => {
    expect(CURRENCIES).toHaveLength(4)
  })
})

describe('Default values', () => {
  test('DEFAULT_LINK_TTL_HOURS is 24', () => {
    expect(DEFAULT_LINK_TTL_HOURS).toBe(24)
  })

  test('DEFAULT_CORRELATION_WINDOW_SEC is 60', () => {
    expect(DEFAULT_CORRELATION_WINDOW_SEC).toBe(60)
  })

  test('MAX_UTM_LENGTH is 500', () => {
    expect(MAX_UTM_LENGTH).toBe(500)
  })

  test('MAX_URL_LENGTH is 2048', () => {
    expect(MAX_URL_LENGTH).toBe(2048)
  })
})

describe('GOAL_KEYS', () => {
  test('contains op_visit', () => {
    expect(GOAL_KEYS).toContain('op_visit')
  })

  test('contains op_click', () => {
    expect(GOAL_KEYS).toContain('op_click')
  })

  test('contains op_subscribe', () => {
    expect(GOAL_KEYS).toContain('op_subscribe')
  })

  test('contains op_unsubscribe', () => {
    expect(GOAL_KEYS).toContain('op_unsubscribe')
  })

  test('contains op_resubscribe', () => {
    expect(GOAL_KEYS).toContain('op_resubscribe')
  })

  test('has exactly 5 goal keys', () => {
    expect(GOAL_KEYS).toHaveLength(5)
  })
})

describe('PLATFORMS', () => {
  test('contains telegram', () => {
    expect(PLATFORMS).toContain('telegram')
  })

  test('contains max', () => {
    expect(PLATFORMS).toContain('max')
  })
})
