import { useMemo, useState } from 'react'
import { Newspaper, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { LiveBadge } from '@/components/common/LiveBadge'
import { SearchInput } from '@/components/common/SearchInput'
import { NewsCard } from '@/components/common/NewsCard'
import { NewsDetailDialog } from '@/components/common/NewsDetailDialog'
import { SentimentSummaryCard } from '@/components/common/SentimentSummaryCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  describeNewsError,
  filterNewsArticles,
  isNewsConfiguredError,
  MARKET_NEWS_CATEGORIES,
} from '@/lib/news'
import { useMarketNews } from '@/hooks/useMarketData'
import type { MarketNewsCategory, NewsArticle, Sentiment } from '@/types'

type SentimentFilter = Sentiment | 'all'

const sentimentOptions: { value: SentimentFilter; label: string }[] = [
  { value: 'all', label: 'All sentiment' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
]

export function MarketNewsPage() {
  const [category, setCategory] = useState<MarketNewsCategory>('general')
  const [query, setQuery] = useState('')
  const [sentiment, setSentiment] = useState<SentimentFilter>('all')
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)

  const feed = useMarketNews(category)
  const results = useMemo(
    () => filterNewsArticles(feed.articles, { query, sentiment }),
    [feed.articles, query, sentiment],
  )

  const isFiltered = query.trim().length > 0 || sentiment !== 'all'
  const hasArticles = feed.articles.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market News"
        description="Live general market headlines from the Finnhub free tier, scored by a transparent sentiment heuristic."
        badge={
          feed.meta ? (
            <LiveBadge
              status={feed.meta.dataStatus}
              cached={feed.meta.cached}
              stale={feed.meta.stale}
            />
          ) : null
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="News categories">
          {MARKET_NEWS_CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={category === option.value}
              onClick={() => setCategory(option.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                category === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search headlines, sources, or tickers…"
            aria-label="Search news"
          />
          <div>
            <label htmlFor="sentiment-filter" className="sr-only">
              Filter by sentiment
            </label>
            <Select
              id="sentiment-filter"
              value={sentiment}
              onChange={(event) =>
                setSentiment(event.target.value as SentimentFilter)
              }
            >
              {sentimentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {feed.sentiment && hasArticles ? (
        <SentimentSummaryCard summary={feed.sentiment} />
      ) : null}

      {feed.loading && !hasArticles ? (
        <LoadingState label="Loading market news…" />
      ) : feed.error && !hasArticles ? (
        isNewsConfiguredError(feed.error) ? (
          <EmptyState
            icon={Settings}
            title={describeNewsError(feed.error).title}
            description={describeNewsError(feed.error).description}
          />
        ) : (
          <ErrorState
            {...describeNewsError(feed.error)}
            action={
              <Button type="button" variant="outline" onClick={feed.reload}>
                Try again
              </Button>
            }
          />
        )
      ) : results.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={isFiltered ? 'No articles match your filters' : 'No articles available'}
          description={
            isFiltered
              ? 'Try a different sentiment or search term.'
              : 'The news provider returned no articles for this category right now.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                onSelect={setSelectedArticle}
              />
            ))}
          </div>

          {feed.hasMore && !isFiltered ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={feed.loadMore}
                disabled={feed.loadingMore}
              >
                {feed.loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <NewsDetailDialog
        article={selectedArticle}
        onOpenChange={(open) => {
          if (!open) setSelectedArticle(null)
        }}
      />
    </div>
  )
}
