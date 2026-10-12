import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Building, Newspaper } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { StockChart } from '@/components/common/StockChart'
import { WatchlistButton } from '@/components/common/WatchlistButton'
import { NewsCard } from '@/components/common/NewsCard'
import { NewsDetailDialog } from '@/components/common/NewsDetailDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PriceChange } from '@/components/common/PriceChange'
import { SymbolBadge } from '@/components/common/StockRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { generateHistory } from '@/mocks/history'
import { getNewsForSymbol, getStockBySymbol } from '@/lib/stocks'
import {
  formatCompact,
  formatCurrency,
  formatMarketCap,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChartRange, NewsArticle } from '@/types'

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function StockDetailsPage() {
  const { symbol = '' } = useParams()
  const stock = getStockBySymbol(symbol)
  const [range, setRange] = useState<ChartRange>('3M')
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  )

  const chartData = useMemo(
    () =>
      stock ? generateHistory(stock.symbol, range, stock.price) : [],
    [stock, range],
  )

  if (!stock) {
    return (
      <div className="space-y-6">
        <Link
          to="/stocks"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Explore Stocks
        </Link>
        <ErrorState
          title={`No demo data for “${symbol.toUpperCase()}”`}
          description="This symbol is not part of the mock dataset. Try searching from the Explore Stocks page."
        />
      </div>
    )
  }

  const relatedNews = getNewsForSymbol(stock.symbol)
  const rangeChange =
    chartData.length > 0
      ? chartData[chartData.length - 1].value - chartData[0].value
      : 0
  const rangeChangePercent =
    chartData.length > 0 ? (rangeChange / chartData[0].value) * 100 : 0

  return (
    <div className="space-y-6">
      <Link
        to="/stocks"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Explore Stocks
      </Link>

      <PageHeader
        title={stock.name}
        description={stock.description}
        badge={<DemoBadge label="Illustrative data" />}
        actions={
          <>
            <WatchlistButton symbol={stock.symbol} showLabel />
            <Link
              to="/alerts"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              Create alert
            </Link>
          </>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <SymbolBadge
            symbol={stock.symbol}
            accent={stock.accent}
            className="size-12 text-base"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {stock.symbol}
              </h2>
              <Badge variant="outline">{stock.sector}</Badge>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {stock.industry}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(stock.price)}
            </p>
            <PriceChange
              change={stock.change}
              changePercent={stock.changePercent}
              size="md"
              className="justify-end"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prev close {formatCurrency(stock.previousClose)}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Price history (demo)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Deterministic mock series · {range} range ·{' '}
              <PriceChange
                change={rangeChange}
                changePercent={rangeChangePercent}
                showAbsolute={false}
                className="text-xs"
              />
            </p>
          </CardHeader>
          <CardContent>
            <StockChart
              data={chartData}
              gradientId={`details-chart-${stock.symbol}`}
              positive={stock.changePercent >= 0}
              activeRange={range}
              onRangeChange={setRange}
              height={320}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key statistics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-3">
            <Stat label="Market cap" value={formatMarketCap(stock.marketCap)} />
            <Stat label="Sector" value={stock.sector} />
            <Stat
              label="P/E ratio"
              value={stock.peRatio > 0 ? stock.peRatio.toFixed(1) : 'N/A'}
              hint={stock.peRatio > 0 ? undefined : 'Not profitable in demo'}
            />
            <Stat label="EPS" value={formatCurrency(stock.eps)} />
            <Stat
              label="Dividend yield"
              value={
                stock.dividendYield > 0
                  ? formatPercent(stock.dividendYield, false)
                  : 'None'
              }
            />
            <Stat label="Industry" value={stock.industry} />
            <Stat label="52-week high" value={formatCurrency(stock.high52)} />
            <Stat label="52-week low" value={formatCurrency(stock.low52)} />
            <Stat label="Volume" value={formatCompact(stock.volume)} />
            <Stat label="Avg volume" value={formatCompact(stock.avgVolume)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-4 text-muted-foreground" aria-hidden="true" />
            Company overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {stock.description}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Briefcase className="size-3.5" aria-hidden="true" />
              {stock.sector}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              {stock.industry}
            </span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Recent related news
          </h2>
          <p className="text-sm text-muted-foreground">
            Illustrative headlines associated with {stock.symbol}.
          </p>
        </div>
        {relatedNews.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No demo news for this symbol"
            description="This prototype only includes a small set of illustrative articles. Browse the Market News page for more."
            className="py-10"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedNews.map((article) => (
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
    </div>
  )
}
