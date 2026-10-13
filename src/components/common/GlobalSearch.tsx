import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { LoaderCircle, SearchX } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { accentForSymbol } from '@/lib/liveStock'
import { cn } from '@/lib/utils'
import { SearchInput } from '@/components/common/SearchInput'
import { PriceChange } from '@/components/common/PriceChange'
import { SymbolBadge } from '@/components/common/StockRow'
import { useQuotes, useSymbolSearch } from '@/hooks/useMarketData'

const SEARCH_LIMIT = 5

interface SearchItem {
  symbol: string
  name: string
  price: number | null
  change: number
  changePercent: number
  accent: string
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useSymbolSearch(query, SEARCH_LIMIT)
  const symbols = useMemo(
    () => (search.data ?? []).map((item) => item.symbol),
    [search.data],
  )
  const quotesState = useQuotes(symbols)

  const results = useMemo<SearchItem[]>(() => {
    const quotes = quotesState.data?.quotes ?? {}
    return (search.data ?? []).map((item) => {
      const quote = quotes[item.symbol]
      return {
        symbol: item.symbol,
        name: quote?.name ?? item.name,
        price: quote?.price ?? null,
        change: quote?.change ?? 0,
        changePercent: quote?.changePercent ?? 0,
        accent: accentForSymbol(item.symbol),
      }
    })
  }, [search.data, quotesState.data])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const select = (symbol: string) => {
    navigate(`/stocks/${symbol}`)
    setQuery('')
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((previous) => (previous + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(
        (previous) => (previous - 1 + results.length) % results.length,
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      select(results[activeIndex].symbol)
    }
  }

  const showPanel = open && query.trim().length > 0
  const loading = search.loading || (symbols.length > 0 && quotesState.loading)

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <SearchInput
        value={query}
        onValueChange={(value) => {
          setQuery(value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search stocks…"
        aria-label="Search stocks"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
      />
      {showPanel ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {loading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <SearchX className="size-4" aria-hidden="true" />
              No stocks match “{query}”
            </div>
          ) : (
            results.map((stock, index) => (
              <button
                key={stock.symbol}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(stock.symbol)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors',
                  index === activeIndex ? 'bg-accent' : 'hover:bg-accent/60',
                )}
              >
                <SymbolBadge
                  symbol={stock.symbol}
                  accent={stock.accent}
                  className="size-8"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {stock.symbol}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {stock.name}
                  </span>
                </span>
                <span className="flex flex-col items-end text-right">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {stock.price != null ? formatCurrency(stock.price) : '—'}
                  </span>
                  {stock.price != null ? (
                    <PriceChange
                      change={stock.change}
                      changePercent={stock.changePercent}
                      showAbsolute={false}
                      showIcon={false}
                      className="text-xs"
                    />
                  ) : null}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
