import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

/**
 * Форматирует дату в человекочитаемый вид
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy, HH:mm', { locale: ru })
}

/**
 * Форматирует дату без времени
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy', { locale: ru })
}

/**
 * Форматирует число с разделителями групп
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n)
}

/**
 * Форматирует число как процент (0–1 → '75%')
 */
export function formatPercent(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(n)
}

/**
 * Форматирует сумму с валютой
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${formatNumber(amount)} ${currency}`
  }
}
