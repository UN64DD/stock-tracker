import { useMemo, useState, type ReactNode } from 'react'
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
import { computePeriodStats } from '@/lib/chart'
import {
  formatCompact,
  formatCompactCurrency,
  formatCurrency,
  formatMarketCap,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  useFinancials,
  useHistory,
  useProfile,
  useQuote,
} from '@/hooks/useMarketData'
import type { ChartRange, ChartType, NewsArticle } from '@/types'

function Metric({
  label,
  value,
  hint,
  unavailable,
}: {
  label: string
  value: string
  hint?: string
  unavailable?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
          unavailable ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{children}</span>
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
  const [chartType, setChartType] = useState<ChartType>('area')
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  )

  const quoteState = useQuote(normalized || undefined)
  const profileState = useProfile(normalized || undefined)
  const historyState = useHistory(normalized || undefined, range)
  const financialsState = useFinancials(normalized || undefined)

  const chartData = useMemo(
    () => historyState.data?.points ?? [],
    [historyState.data],
  )
  const periodStats = useMemo(() => computePeriodStats(chartData), [chartData])

  const handleRetry = () => {
    quoteState.reload()
    profileState.reload()
    historyState.reload()
    financialsState.reload()
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
  const financials = financialsState.data
  const stock = toStockView(quote, profile)
  const relatedNews = getNewsForSymbol(stock.symbol)

  const currency = financials?.currency ?? quote.currency ?? profile?.currency ?? 'USD'

  const marketCap = financials?.marketCap ?? profile?.marketCap ?? null
  const high52Week = financials?.high52Week ?? quote.high52Week
  const low52Week = financials?.low52Week ?? quote.low52Week
  const averageVolume = financials?.averageVolume ?? quote.averageVolume

  const reportedLoading = financialsState.loading && !financials
  const reportedErrored = Boolean(financialsState.error) && !financials

  const chartPositive = periodStats
    ? periodStats.changePercent >= 0
    : stock.changePercent >= 0

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        title={stock.name}
        description={profile?.description || `Live market data for ${stock.symbol}.`}
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
              {formatCurrency(quote.price, currency)}
            </p>
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Today</span>
              <PriceChange
                change={stock.change}
                changePercent={stock.changePercent}
                size="md"
                currency={currency}
                className="justify-end"
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prev close{' '}
              {quote.previousClose != null
                ? formatCurrency(quote.previousClose, currency)
                : UNAVAILABLE}{' '}
              · {currency}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Price history</CardTitle>
            <p className="text-sm text-muted-foreground">
              {historyState.data?.interval ?? 'live'} interval · {range} range
              {periodStats ? (
                <>
                  {' · '}
                  <span className="text-muted-foreground">Period</span>{' '}
                  <PriceChange
                    change={periodStats.change}
                    changePercent={periodStats.changePercent}
                    showAbsolute={false}
                    currency={currency}
                    className="text-xs"
                  />
                </>
              ) : null}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric
                label="Current price"
                value={formatCurrency(quote.price, currency)}
              />
              <Metric
                label="Period open"
                value={
                  periodStats ? formatCurrency(periodStats.open, currency) : UNAVAILABLE
                }
              />
              <Metric
                label="Period close"
                value={
                  periodStats ? formatCurrency(periodStats.close, currency) : UNAVAILABLE
                }
              />
              <Metric
                label="Period high"
                value={
                  periodStats ? formatCurrency(periodStats.high, currency) : UNAVAILABLE
                }
              />
              <Metric
                label="Period low"
                value={
                  periodStats ? formatCurrency(periodStats.low, currency) : UNAVAILABLE
                }
              />
              <Metric
                label={`${range} change`}
                value={
                  periodStats ? formatPercent(periodStats.changePercent) : UNAVAILABLE
                }
                unavailable={!periodStats}
              />
            </div>

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
                positive={chartPositive}
                activeRange={range}
                onRangeChange={setRange}
                chartType={chartType}
                onChartTypeChange={setChartType}
                currency={currency}
                height={320}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="size-4 text-muted-foreground" aria-hidden="true" />
              Company summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{stock.name}</p>
              <p className="text-xs text-muted-foreground">
                {stock.symbol}
                {quote.exchange ? ` · ${quote.exchange}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {profile?.sector ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  <Briefcase className="size-3.5" aria-hidden="true" />
                  {profile.sector}
                </span>
              ) : null}
              {profile?.industry ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {profile.industry}
                </span>
              ) : null}
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {profileState.loading && !profile
                ? 'Loading company profile…'
                : profile?.description ||
                  'No company description is available for this symbol.'}
            </p>

            <div className="space-y-2 border-t border-border pt-3">
              <SummaryRow label="Latest price">
                {formatCurrency(quote.price, currency)}
              </SummaryRow>
              <SummaryRow label="Daily movement">
                <PriceChange
                  change={stock.change}
                  changePercent={stock.changePercent}
                  currency={currency}
                  className="justify-end text-sm"
                />
              </SummaryRow>
              <SummaryRow label="Market cap">
                {marketCap != null ? formatMarketCap(marketCap, currency) : UNAVAILABLE}
              </SummaryRow>
              <SummaryRow label={`${range} performance`}>
                {periodStats ? (
                  <PriceChange
                    change={periodStats.change}
                    changePercent={periodStats.changePercent}
                    showAbsolute={false}
                    currency={currency}
                    className="justify-end text-sm"
                  />
                ) : (
                  UNAVAILABLE
                )}
              </SummaryRow>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financials</CardTitle>
          <p className="text-sm text-muted-foreground">
            Live market data versus figures the company most recently reported.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-3">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live market data
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric
                label="52-week high"
                value={
                  high52Week != null
                    ? formatCurrency(high52Week, currency)
                    : UNAVAILABLE
                }
                unavailable={high52Week == null}
              />
              <Metric
                label="52-week low"
                value={
                  low52Week != null
                    ? formatCurrency(low52Week, currency)
                    : UNAVAILABLE
                }
                unavailable={low52Week == null}
              />
              <Metric
                label="Average volume"
                value={
                  averageVolume != null ? formatCompact(averageVolume) : UNAVAILABLE
                }
                hint="Provider-reported average"
                unavailable={averageVolume == null}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reported fundamentals
            </h3>
            {reportedLoading ? (
              <LoadingState variant="rows" label="Loading reported financials…" />
            ) : reportedErrored ? (
              <ErrorState
                title="Reported financials unavailable"
                description={
                  isApiError(financialsState.error)
                    ? financialsState.error.message
                    : 'Could not load reported financials right now.'
                }
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={financialsState.reload}
                  >
                    Try again
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Metric
                  label="Market cap"
                  value={marketCap != null ? formatMarketCap(marketCap, currency) : UNAVAILABLE}
                  hint={marketCap == null ? 'Not available' : undefined}
                  unavailable={marketCap == null}
                />
                <Metric
                  label="P/E ratio"
                  value={financials?.trailingPe != null ? financials.trailingPe.toFixed(2) : UNAVAILABLE}
                  hint="Trailing 12 months"
                  unavailable={financials?.trailingPe == null}
                />
                <Metric
                  label="EPS"
                  value={
                    financials?.eps != null
                      ? formatCurrency(financials.eps, currency)
                      : UNAVAILABLE
                  }
                  hint="Diluted, TTM"
                  unavailable={financials?.eps == null}
                />
                <Metric
                  label="Dividend yield"
                  value={
                    financials?.dividendYieldPercent != null
                      ? `${financials.dividendYieldPercent.toFixed(2)}%`
                      : UNAVAILABLE
                  }
                  hint="Trailing 12 months"
                  unavailable={financials?.dividendYieldPercent == null}
                />
                <Metric
                  label="Revenue"
                  value={
                    financials?.revenue != null
                      ? formatCompactCurrency(financials.revenue, currency)
                      : UNAVAILABLE
                  }
                  hint={financials?.revenuePeriod ?? 'Latest reported'}
                  unavailable={financials?.revenue == null}
                />
              </div>
            )}
            {financials?.limited ? (
              <p className="text-xs text-muted-foreground">
                {financials.limitationReason ??
                  'Reported fundamentals are not available on the current data plan.'}
              </p>
            ) : null}
          </section>
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
