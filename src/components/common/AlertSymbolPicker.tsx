import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, SearchX, X } from 'lucide-react'
import { SearchInput } from '@/components/common/SearchInput'
import { SymbolBadge } from '@/components/common/StockRow'
import { useSymbolSearch } from '@/hooks/useMarketData'
import { accentForSymbol } from '@/lib/liveStock'
import { searchStocks } from '@/lib/stocks'
import { cn } from '@/lib/utils'

export interface AlertSymbolSelection {
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
}

interface AlertSymbolPickerProps {
  value: AlertSymbolSelection | null
  onChange: (selection: AlertSymbolSelection | null) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}

/**
 * Symbol picker backed by the live provider search, so users can only choose
 * symbols the market data provider knows about. Falls back to the local demo
 * catalogue when the provider search is unavailable (e.g. no API key), so the
 * form still works offline.
 */
export function AlertSymbolPicker({
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: AlertSymbolPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useSymbolSearch(query, 8)
  const usingFallback = !search.loading && Boolean(search.error)
  const results = usingFallback
    ? searchStocks(query)
        .slice(0, 8)
        .map((stock) => ({
          symbol: stock.symbol,
          name: stock.name,
          currency: null,
          exchange: null,
        }))
    : search.data ?? []

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  if (value) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-2.5',
          invalid && 'border-destructive',
        )}
      >
        <SymbolBadge symbol={value.symbol} accent={accentForSymbol(value.symbol)} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{value.symbol}</p>
          {value.name ? (
            <p className="truncate text-xs text-muted-foreground">{value.name}</p>
          ) : null}
        </div>
        {disabled ? null : (
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setQuery('')
              setOpen(true)
            }}
            aria-label={`Change symbol (currently ${value.symbol})`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }

  const showPanel = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative">
      <SearchInput
        value={query}
        onValueChange={(next) => {
          setQuery(next)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search for a symbol…"
        aria-label="Search for a stock symbol"
        aria-describedby={describedBy}
        aria-invalid={invalid}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="alert-symbol-results"
        disabled={disabled}
        className={cn(invalid && 'border-destructive')}
      />
      {showPanel ? (
        <div
          id="alert-symbol-results"
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {search.loading && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <SearchX className="size-4" aria-hidden="true" />
              No stocks match “{query}”
            </div>
          ) : (
            results.map((result) => (
              <button
                key={result.symbol}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  onChange({
                    symbol: result.symbol,
                    name: result.name ?? null,
                    currency: result.currency ?? null,
                    exchange: result.exchange ?? null,
                  })
                  setQuery('')
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/60"
              >
                <SymbolBadge
                  symbol={result.symbol}
                  accent={accentForSymbol(result.symbol)}
                  className="size-8"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {result.symbol}
                  </span>
                  {result.name ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {result.name}
                    </span>
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
