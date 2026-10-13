import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, Building, Newspaper } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LiveBadge } from '@/components/common/LiveBadge'
import { StockChart } from '@/components/common/StockChart'
import { WatchlistButton } from '@/components/common/WatchlistButton'
import { NewsCard } from '@/components/common/NewsCard'
import { NewsDetailDialog } from '@/components/common/NewsDetailDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { PriceChange } from '@/components/common/PriceChange'
import { SymbolBadge } from '@/components/common/StockRow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { getNewsForSymbol } from '@/lib/stocks'
import { isApiError } from '@/lib/api'
import { toStockView, UNAVAILABLE } from '@/lib/liveStock'
import {
  formatCompact,
  formatCurrency,
  formatMarketCap,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { useHistory, useProfile, useQuote } from '@/hooks/useMarketData'
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

function BackLink() {
  return (
    <Link
      to="/stocks"
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to Explore Stocks
    </Link>
  )
}

export function StockDetailsPage() {
  const { symbol = '' } = useParams()
  const normalized = symbol.trim().toUpperCase()
  const [range, setRange] = useState<ChartRange>('3M')
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  )

  const quoteState = useQuote(normalized || undefined)
  const profileState = useProfile(normalized || undefined)
  const historyState = useHistory(normalized || undefined, range)

  const handleRetry = () => {
    quoteState.reload()
    profileState.reload()
    historyState.reload()
  }

  if (quoteState.loading && !quoteState.data) {
    return (
      <div className="space-y-6">
        <BackLink />
        <LoadingState label={`Loading live data for ${normalized}…`} />
      </div>
    )
  }

  if (quoteState.error || !quoteState.data) {
    const notFound =
      isApiError(quoteState.error) && quoteState.error.code === 'not_found'
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorState
          title={notFound ? `No data for “${normalized}”` : 'Could not load this symbol'}
          description={
            notFound
              ? 'Market data covers US-listed equities and ETFs. Try searching from the Explore Stocks page.'
              : isApiError(quoteState.error)
                ? quoteState.error.message
                : 'The market data service is unavailable right now.'
          }
          action={
            notFound ? undefined : (
              <Button type="button" variant="outline" onClick={handleRetry}>
                Try again
              </Button>
            )
          }
        />
      </div>
    )
  }

  const quote = quoteState.data
  const profile = profileState.data
  const stock = toStockView(quote, profile)
  const chartData = historyState.data?.points ?? []
  const relatedNews = getNewsForSymbol(stock.symbol)

  const rangeChange =
    chartData.length > 1
      ? chartData[chartData.length - 1].value - chartData[0].value
      : 0
  const rangeChangePercent =
    chartData.length > 1 && chartData[0].value !== 0
      ? (rangeChange / chartData[0].value) * 100
      : 0

  const currency = quote.currency ?? profile?.currency ?? 'USD'
  const formatMoney = (value: number | null) =>
    value != null ? formatCurrency(value) : UNAVAILABLE

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        title={stock.name}
        description={
          profile?.description ||
          `Live market data for ${stock.symbol}.`
        }
        badge={
          quoteState.meta ? (
            <LiveBadge
              status={quoteState.meta.dataStatus}
              cached={quoteState.meta.cached}
              stale={quoteState.meta.stale}
            />
          ) : null
        }
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
              {profile?.sector ? (
                <Badge variant="outline">{profile.sector}</Badge>
              ) : null}
              {quote.exchange ? (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  {quote.exchange}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(quote.price)}
            </p>
            <PriceChange
              change={stock.change}
              changePercent={stock.changePercent}
              size="md"
              className="justify-end"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prev close {formatMoney(quote.previousClose)} · {currency}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Price history</CardTitle>
            <p className="text-sm text-muted-foreground">
              {historyState.data?.interval ?? 'live'} interval · {range} range ·{' '}
              <PriceChange
                change={rangeChange}
                changePercent={rangeChangePercent}
                showAbsolute={false}
                className="text-xs"
              />
            </p>
          </CardHeader>
          <CardContent>
            {historyState.loading && chartData.length === 0 ? (
              <LoadingState label="Loading price history…" />
            ) : historyState.error && chartData.length === 0 ? (
              <ErrorState
                title="Price history unavailable"
                description={
                  isApiError(historyState.error)
                    ? historyState.error.message
                    : 'Could not load price history for this range.'
                }
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={historyState.reload}
                  >
                    Try again
                  </Button>
                }
              />
            ) : (
              <StockChart
                data={chartData}
                gradientId={`details-chart-${stock.symbol}`}
                positive={stock.changePercent >= 0}
                activeRange={range}
                onRangeChange={setRange}
                height={320}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key statistics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-3">
            <Stat
              label="Market cap"
              value={
                profile?.marketCap != null
                  ? formatMarketCap(profile.marketCap)
                  : UNAVAILABLE
              }
            />
            <Stat label="Sector" value={profile?.sector ?? UNAVAILABLE} />
            <Stat
              label="P/E ratio"
              value={UNAVAILABLE}
              hint="Not on free tier"
            />
            <Stat label="EPS" value={UNAVAILABLE} hint="Not on free tier" />
            <Stat
              label="Dividend yield"
              value={UNAVAILABLE}
              hint="Not on free tier"
            />
            <Stat label="Industry" value={profile?.industry ?? UNAVAILABLE} />
            <Stat
              label="52-week high"
              value={formatMoney(quote.high52Week)}
            />
            <Stat label="52-week low" value={formatMoney(quote.low52Week)} />
            <Stat
              label="Volume"
              value={quote.volume != null ? formatCompact(quote.volume) : UNAVAILABLE}
            />
            <Stat
              label="Avg volume"
              value={
                quote.averageVolume != null
                  ? formatCompact(quote.averageVolume)
                  : UNAVAILABLE
              }
            />
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
          {profileState.loading && !profile ? (
            <LoadingState label="Loading company profile…" />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {profile?.description ||
                'No company description is available for this symbol.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {profile?.sector ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <Briefcase className="size-3.5" aria-hidden="true" />
                {profile.sector}
              </span>
            ) : null}
            {profile?.industry ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                {profile.industry}
              </span>
            ) : null}
            {profile?.country ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                {profile.country}
              </span>
            ) : null}
            {profile?.employees != null ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                {formatCompact(profile.employees)} employees
              </span>
            ) : null}
          </div>
          {profile?.limited ? (
            <p className="text-xs text-muted-foreground">
              {profile.limitationReason ??
                'Only a limited company profile is available on the current data plan.'}
            </p>
          ) : null}
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
