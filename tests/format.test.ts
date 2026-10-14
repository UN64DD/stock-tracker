import { describe, expect, it } from 'vitest'
import {
  formatChange,
  formatCompact,
  formatCompactCurrency,
  formatCurrency,
  formatMarketCap,
  formatPercent,
} from '@/lib/format'

describe('formatCurrency', () => {
  it('defaults to USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats the requested currency', () => {
    expect(formatCurrency(1234.5, 'EUR')).toContain('1,234.50')
    expect(formatCurrency(1234.5, 'EUR')).toContain('€')
  })

  it('falls back to USD for an invalid currency code', () => {
    expect(() => formatCurrency(10, 'NOT_A_CODE')).not.toThrow()
    expect(formatCurrency(10, 'NOT_A_CODE')).toBe('$10.00')
  })
})

describe('formatPercent', () => {
  it('prefixes a sign by default', () => {
    expect(formatPercent(2.5)).toBe('+2.50%')
    expect(formatPercent(-2.5)).toBe('−2.50%')
    expect(formatPercent(0)).toBe('0.00%')
  })

  it('omits the sign when requested', () => {
    expect(formatPercent(-2.5, false)).toBe('2.50%')
  })
})

describe('compact formatting', () => {
  it('formats large numbers compactly', () => {
    expect(formatCompact(1_234_567)).toBe('1.23M')
  })

  it('formats market cap with a currency symbol', () => {
    expect(formatMarketCap(2_500_000_000_000)).toBe('$2.5T')
    expect(formatMarketCap(2_500_000_000_000, 'EUR')).toContain('2.5T')
  })

  it('formats compact currency', () => {
    expect(formatCompactCurrency(347_155_005_440)).toBe('$347.16B')
  })
})

describe('formatChange', () => {
  it('includes a signed currency value', () => {
    expect(formatChange(1.23)).toBe('+$1.23')
    expect(formatChange(-1.23)).toBe('−$1.23')
  })

  it('respects the requested currency', () => {
    expect(formatChange(1.23, 'EUR')).toContain('€1.23')
  })
})
