import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ChartLine,
  Gauge,
  Landmark,
  ArrowUpRight,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { StatCard } from '@/components/common/StatCard'
import { StockChart } from '@/components/common/StockChart'
import { StockRow } from '@/components/common/StockRow'
import { NewsCard } from '@/components/common/NewsCard'
import { NewsDetailDialog } from '@/components/common/NewsDetailDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { PriceChange } from '@/components/common/PriceChange'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { marketIndices } from '@/mocks/indices'
import { generateHistory } from '@/mocks/history'
import { newsArticles } from '@/mocks/news'
import {
  getTopGainers,
  getTopLosers,
  sortNewsByDate,
} from '@/lib/stocks'
import { formatNumber, formatCurrency } from '@/lib/format'
import { useWatchlist } from '@/contexts/watchlist-context'
import { cn } from '@/lib/utils'
import type { ChartRange, NewsArticle, Stock } from '@/types'

const indexIcons = [Gauge, Landmark, Activity, ChartLine]

function MoverRow({ stock, rank }: { stock: Stock; rank: number }) {
  return (
    <Link
      to={`/stocks/${stock.symbol}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="w-4 text-xs font-medium tabular-nums text-muted-foreground">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {stock.symbol}
        </p>
        <p className="truncate text-xs text-muted-foreground">{stock.name}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {formatCurrency(stock.price)}
        </p>
        <PriceChange
          change={stock.change}
          changePercent={stock.changePercent}
          showAbsolute={false}
          showIcon={false}
          className="justify-end text-xs"
        />
      </div>
    </Link>
  )
}

export function DashboardPage() {
  const [range, setRange] = useState<ChartRange>('1M')
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  )
  const { stocks: watchlistStocks, symbols } = useWatchlist()

  const sp500 = marketIndices[0]
  const chartData = useMemo(
    () => generateHistory(sp500.symbol, range, sp500.value),
    [range, sp500.symbol, sp500.value],
  )

  const gainers = getTopGainers(5)
  const losers = getTopLosers(5)
  const latestNews = sortNewsByDate(newsArticles).slice(0, 4)
  const previewWatchlist = watchlistStocks.slice(0, 5)

  const rangeChange =
    chartData[chartData.length - 1].value - chartData[0].value
  const rangeChangePercent = (rangeChange / chartData[0].value) * 100

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Overview"
        description="A snapshot of major indices, your watchlist, and illustrative market activity."
        badge={<DemoBadge label="Mock market data" />}
        actions={
          <Link to="/stocks" className={cn(buttonVariants({ variant: 'outline' }))}>
            Explore stocks
            <ArrowUpRight aria-hidden="true" />
          </Link>
        }
      />

      <section
        aria-label="Market summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {marketIndices.map((index, position) => (
          <StatCard
            key={index.symbol}
            label={index.name}
            value={formatNumber(index.value)}
            change={index.change}
            changePercent={index.changePercent}
            icon={indexIcons[position] ?? Gauge}
            footer="Illustrative value · updates not live"
          />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{sp500.name} — demo performance</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatNumber(sp500.value)} ·{' '}
                <PriceChange
                  change={rangeChange}
                  changePercent={rangeChangePercent}
                  showAbsolute={false}
                  className="text-xs"
                />{' '}
                across {range}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <StockChart
              data={chartData}
              gradientId="dashboard-chart"
              positive={sp500.changePercent >= 0}
              activeRange={range}
              onRangeChange={setRange}
              height={320}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Watchlist preview</CardTitle>
            <Link
              to="/watchlist"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-1 pt-3">
            {previewWatchlist.length === 0 ? (
              <EmptyState
                title="No saved stocks"
                description="Add symbols from a stock details page to see them here."
                className="py-10"
              />
            ) : (
              previewWatchlist.map((stock) => (
                <StockRow key={stock.symbol} stock={stock} />
              ))
            )}
            <p className="pt-2 text-xs text-muted-foreground">
              Tracking {symbols.length} of {watchlistStocks.length} saved symbols.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top gainers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-3">
            {gainers.map((stock, position) => (
              <MoverRow key={stock.symbol} stock={stock} rank={position + 1} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top losers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-3">
            {losers.map((stock, position) => (
              <MoverRow key={stock.symbol} stock={stock} rank={position + 1} />
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Market news
            </h2>
            <p className="text-sm text-muted-foreground">
              Illustrative headlines for layout testing only.
            </p>
          </div>
          <Link
            to="/news"
            className="text-sm font-medium text-primary hover:underline"
          >
            All news
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {latestNews.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onSelect={setSelectedArticle}
            />
          ))}
        </div>
      </section>

      <NewsDetailDialog
        article={selectedArticle}
        onOpenChange={(open) => {
          if (!open) setSelectedArticle(null)
        }}
      />

      <p className="text-xs text-muted-foreground">
        Note: All prices shown are deterministic mock values generated for this
        prototype and are not live quotes.
      </p>
    </div>
  )
}
