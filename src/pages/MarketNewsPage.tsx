import { useMemo, useState } from 'react'
import { Newspaper } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { SearchInput } from '@/components/common/SearchInput'
import { NewsCard } from '@/components/common/NewsCard'
import { NewsDetailDialog } from '@/components/common/NewsDetailDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { newsArticles, newsCategories } from '@/mocks/news'
import { sortNewsByDate } from '@/lib/stocks'
import type { NewsArticle, NewsCategory, Sentiment } from '@/types'

type CategoryFilter = NewsCategory | 'all'
type SentimentFilter = Sentiment | 'all'

const sentimentOptions: { value: SentimentFilter; label: string }[] = [
  { value: 'all', label: 'All sentiment' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
]

export function MarketNewsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sentiment, setSentiment] = useState<SentimentFilter>('all')
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  )

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = newsArticles.filter((article) => {
      const matchesCategory =
        category === 'all' || article.category === category
      const matchesSentiment =
        sentiment === 'all' || article.sentiment === sentiment
      const matchesQuery =
        !term ||
        article.headline.toLowerCase().includes(term) ||
        article.source.toLowerCase().includes(term) ||
        (article.ticker?.toLowerCase().includes(term) ?? false) ||
        (article.company?.toLowerCase().includes(term) ?? false)
      return matchesCategory && matchesSentiment && matchesQuery
    })
    return sortNewsByDate(filtered)
  }, [query, category, sentiment])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market News"
        description="Illustrative headlines for layout testing. Sources and articles are fictional and links are placeholders."
        badge={<DemoBadge label="Fictional content" />}
      />

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="News categories">
          {(['all', ...newsCategories] as CategoryFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                category === option
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {option === 'all' ? 'All' : option}
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

      {results.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No articles match your filters"
          description="Try a different category, sentiment, or search term. This demo contains a limited set of fictional articles."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onSelect={setSelectedArticle}
            />
          ))}
        </div>
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
