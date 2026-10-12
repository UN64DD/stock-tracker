import { useMemo, useState } from 'react'
import { ChartLine } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { SearchInput } from '@/components/common/SearchInput'
import { StockTable } from '@/components/common/StockTable'
import { EmptyState } from '@/components/common/EmptyState'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { stocks } from '@/mocks/stocks'
import {
  searchStocks,
  sortStocks,
  type SortDirection,
  type StockSortKey,
} from '@/lib/stocks'

const sectors = Array.from(new Set(stocks.map((stock) => stock.sector))).sort()

export function ExploreStocksPage() {
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('all')
  const [sortKey, setSortKey] = useState<StockSortKey>('changePercent')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const results = useMemo(() => {
    const searched = searchStocks(query)
    const filtered =
      sector === 'all'
        ? searched
        : searched.filter((stock) => stock.sector === sector)
    return sortStocks(filtered, sortKey, sortDirection)
  }, [query, sector, sortKey, sortDirection])

  const handleSortChange = (key: StockSortKey) => {
    if (key === sortKey) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection(key === 'name' || key === 'symbol' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explore Stocks"
        description="Search and sort a mock universe of symbols. Everything here is illustrative demo data."
        badge={<DemoBadge label={`${stocks.length} mock symbols`} />}
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search by symbol, company, or sector…"
              aria-label="Search stocks"
            />
          </div>
          <div>
            <label htmlFor="sector-filter" className="sr-only">
              Filter by sector
            </label>
            <Select
              id="sector-filter"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            >
              <option value="all">All sectors</option>
              {sectors.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="sort-key" className="sr-only">
              Sort stocks
            </label>
            <Select
              id="sort-key"
              value={sortKey}
              onChange={(event) =>
                handleSortChange(event.target.value as StockSortKey)
              }
            >
              <option value="changePercent">Sort by % change</option>
              <option value="price">Sort by price</option>
              <option value="marketCap">Sort by market cap</option>
              <option value="name">Sort by company</option>
              <option value="symbol">Sort by symbol</option>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {results.length} result{results.length === 1 ? '' : 's'} ·
          sorted {sortDirection === 'asc' ? 'ascending' : 'descending'} — click a
          column header to change sorting.
        </p>
      </Card>

      {results.length === 0 ? (
        <EmptyState
          icon={ChartLine}
          title="No stocks match your search"
          description="Try a different symbol, company name, or sector. The demo dataset contains a limited set of symbols."
        />
      ) : (
        <Card className="overflow-hidden">
          <StockTable
            stocks={results}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </Card>
      )}
    </div>
  )
}
