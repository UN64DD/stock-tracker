import { ValidationError } from './errors.js'

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y'

export const CHART_RANGES: readonly ChartRange[] = [
  '1D',
  '1W',
  '1M',
  '3M',
  '6M',
  '1Y',
  '5Y',
] as const

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,14}$/

export function normalizeSymbol(raw: string | undefined): string {
  if (!raw) throw new ValidationError('A stock symbol is required.')
  const symbol = raw.trim().toUpperCase()
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new ValidationError(`"${raw}" is not a valid stock symbol.`)
  }
  return symbol
}

export function parseSymbols(raw: string | undefined, max = 8): string[] {
  if (!raw) throw new ValidationError('A "symbols" query parameter is required.')
  const symbols = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (symbols.length === 0) {
    throw new ValidationError('At least one symbol is required.')
  }
  if (symbols.length > max) {
    throw new ValidationError(`At most ${max} symbols can be requested at once.`)
  }
  const normalized = symbols.map((value) => normalizeSymbol(value))
  return Array.from(new Set(normalized))
}

export function parseRange(raw: string | undefined, fallback: ChartRange = '1M'): ChartRange {
  if (!raw) return fallback
  const range = raw.trim().toUpperCase() as ChartRange
  if (!CHART_RANGES.includes(range)) {
    throw new ValidationError(
      `Unsupported range "${raw}". Supported ranges: ${CHART_RANGES.join(', ')}.`,
    )
  }
  return range
}

export function parseSearchQuery(raw: string | undefined): string {
  const query = raw?.trim() ?? ''
  if (query.length < 1) {
    throw new ValidationError('A non-empty "q" search query is required.')
  }
  if (query.length > 40) {
    throw new ValidationError('Search queries must be 40 characters or fewer.')
  }
  return query
}
