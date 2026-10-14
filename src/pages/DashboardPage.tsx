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
import { SentimentSummaryCard } from '@/components/common/SentimentSummaryCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { PriceChange } from '@/components/common/PriceChange'
import { useMarketNews, useQuotes } from '@/hooks/useMarketData'
import { toStockView } from '@/lib/liveStock'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { marketIndices } from '@/mocks/indices'
import { generateHistory } from '@/mocks/history'
import { getTopGainers, getTopLosers } from '@/lib/stocks'
import { describeNewsError } from '@/lib/news'
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
  const { symbols, isAuthenticated, loading: watchlistLoading } = useWatchlist()
  const previewSymbols = useMemo(() => symbols.slice(0, 5), [symbols])
  const watchlistQuotes = useQuotes(previewSymbols)

  const sp500 = marketIndices[0]
  const chartData = useMemo(
    () => generateHistory(sp500.symbol, range, sp500.value),
    [range, sp500.symbol, sp500.value],
  )

  const gainers = getTopGainers(5)
  const losers = getTopLosers(5)
  const newsFeed = useMarketNews('general', 4)
  const latestNews = newsFeed.articles.slice(0, 4)

  const previewWatchlist = useMemo(() => {
    const quotes = watchlistQuotes.data?.quotes ?? {}
    return previewSymbols
      .map((symbol) => quotes[symbol])
      .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote))
      .map((quote) => toStockView(quote))
  }, [previewSymbols, watchlistQuotes.data])

  const rangeChange =
    chartData[chartData.length - 1].value - chartData[0].value
  const rangeChangePercent = (rangeChange / chartData[0].value) * 100

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Overview"
        description="Index values and top movers are mock data; your watchlist and market news are live."
        badge={<DemoBadge label="Indices mock · watchlist & news live" />}
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
              positive={rangeChange >= 0}
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
            {!isAuthenticated ? (
              <EmptyState
                title="Sign in to save a watchlist"
                description="Your watchlist is stored on your account so it follows you across devices."
                className="py-10"
                action={
                  <Link to="/login" className={cn(buttonVariants({ size: 'sm' }))}>
                    Sign in
                  </Link>
                }
              />
            ) : watchlistLoading && previewSymbols.length === 0 ? (
              <LoadingState variant="rows" label="Loading your watchlist…" />
            ) : watchlistQuotes.loading && previewWatchlist.length === 0 ? (
              <LoadingState variant="rows" label="Loading watchlist quotes…" />
            ) : watchlistQuotes.error && previewWatchlist.length === 0 ? (
              <EmptyState
                title="Live quotes unavailable"
                description="The market data service could not be reached. Start it with “npm run dev:server”."
                className="py-10"
              />
            ) : previewWatchlist.length === 0 ? (
              <EmptyState
                title="No saved stocks"
                description="Add symbols from a stock details page to see them here."
                className="py-10"
                action={
                  <Link to="/stocks" className={cn(buttonVariants({ size: 'sm' }))}>
                    Explore stocks
                  </Link>
                }
              />
            ) : (
              previewWatchlist.map((stock) => (
                <StockRow key={stock.symbol} stock={stock} />
              ))
            )}
            {isAuthenticated && symbols.length > 0 ? (
              <p className="pt-2 text-xs text-muted-foreground">
                Live quotes for {previewWatchlist.length} of {symbols.length} saved
                symbol{symbols.length === 1 ? '' : 's'}.
              </p>
            ) : null}
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
              Live general headlines with a heuristic sentiment reading.
            </p>
          </div>
          <Link
            to="/news"
            className="text-sm font-medium text-primary hover:underline"
          >
            All news
          </Link>
        </div>

        {newsFeed.sentiment && latestNews.length > 0 ? (
          <SentimentSummaryCard summary={newsFeed.sentiment} />
        ) : null}

        {newsFeed.loading && latestNews.length === 0 ? (
          <LoadingState variant="rows" label="Loading market news…" />
        ) : newsFeed.error && latestNews.length === 0 ? (
          <EmptyState
            title={describeNewsError(newsFeed.error).title}
            description={describeNewsError(newsFeed.error).description}
          />
        ) : latestNews.length === 0 ? (
          <EmptyState
            title="No market news right now"
            description="The news provider returned no articles. Try again shortly."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {latestNews.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                onSelect={setSelectedArticle}
              />
            ))}
          </div>
        )}
      </section>

      <NewsDetailDialog
        article={selectedArticle}
        onOpenChange={(open) => {
          if (!open) setSelectedArticle(null)
        }}
      />

      <p className="text-xs text-muted-foreground">
        Note: Index values and top movers are illustrative mock data. Watchlist
        quotes and market news are fetched live from the API server.
      </p>
    </div>
  )
}
