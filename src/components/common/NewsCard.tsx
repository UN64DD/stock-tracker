import { Clock, Newspaper } from 'lucide-react'
import type { NewsArticle } from '@/types'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SentimentBadge } from './SentimentBadge'

interface NewsCardProps {
  article: NewsArticle
  onSelect?: (article: NewsArticle) => void
  className?: string
}

export function NewsCard({ article, onSelect, className }: NewsCardProps) {
  const interactive = Boolean(onSelect)

  return (
    <Card
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onSelect?.(article) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect?.(article)
              }
            }
          : undefined
      }
      className={cn(
        'flex h-full flex-col gap-3 p-5 transition-colors',
        interactive &&
          'cursor-pointer hover:border-foreground/20 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SentimentBadge sentiment={article.sentiment} />
        <Badge variant="secondary" className="font-normal">
          {article.category}
        </Badge>
        {article.ticker ? (
          <Badge variant="outline">{article.ticker}</Badge>
        ) : null}
      </div>
      <h3 className="text-sm font-semibold leading-snug text-foreground">
        {article.headline}
      </h3>
      <p className="line-clamp-3 text-sm text-muted-foreground">
        {article.summary}
      </p>
      <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Newspaper className="size-3.5" aria-hidden="true" />
        <span className="font-medium text-foreground/80">{article.source}</span>
        <span aria-hidden="true">·</span>
        <Clock className="size-3.5" aria-hidden="true" />
        <span>{formatRelativeTime(article.publishedAt)}</span>
      </div>
    </Card>
  )
}
