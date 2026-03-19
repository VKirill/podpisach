import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateShort,
  formatNumber,
  formatPercent,
  formatCurrency,
} from '../../utils/format.js'

describe('formatDate', () => {
  it('форматирует Date объект', () => {
    const d = new Date('2024-03-15T10:30:00')
    const result = formatDate(d)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/10:30/)
  })

  it('форматирует ISO строку', () => {
    const result = formatDate('2024-01-05T09:00:00')
    expect(result).toMatch(/5/)
    expect(result).toMatch(/2024/)
  })
})

describe('formatDateShort', () => {
  it('форматирует дату без времени', () => {
    const result = formatDateShort(new Date('2024-06-20'))
    expect(result).toMatch(/20/)
    expect(result).toMatch(/2024/)
    expect(result).not.toMatch(/:/)
  })
})

describe('formatNumber', () => {
  it('форматирует большое число с разделителями', () => {
    const result = formatNumber(1_234_567)
    // Русская локаль использует пробел или неразрывный пробел как разделитель тысяч
    expect(result).toMatch(/1/)
    expect(result).toMatch(/234/)
    expect(result).toMatch(/567/)
    // Должен содержать разделители (длина > 7 символов)
    expect(result.length).toBeGreaterThan(7)
  })

  it('форматирует ноль', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatPercent', () => {
  it('конвертирует 0.75 → "75%"', () => {
    const result = formatPercent(0.75)
    expect(result).toContain('75')
    expect(result).toContain('%')
  })

  it('форматирует 1.0 → "100%"', () => {
    const result = formatPercent(1.0)
    expect(result).toContain('100')
    expect(result).toContain('%')
  })

  it('форматирует дробный процент с max 1 знаком', () => {
    const result = formatPercent(0.333)
    expect(result).toContain('33')
    expect(result).toContain('%')
    // Не более 1 знака после запятой
    const digits = result.replace(/[^0-9,]/g, '')
    expect(digits.length).toBeLessThanOrEqual(5)
  })
})

describe('formatCurrency', () => {
  it('форматирует рубли со знаком ₽', () => {
    const result = formatCurrency(100, 'RUB')
    expect(result).toContain('100')
    expect(result).toContain('₽')
  })

  it('форматирует евро', () => {
    const result = formatCurrency(50, 'EUR')
    expect(result).toContain('50')
  })

  it('fallback для неизвестной валюты', () => {
    const result = formatCurrency(42, 'XYZ')
    expect(result).toContain('42')
    expect(result).toContain('XYZ')
  })
})
