import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SentimentBadge } from './SentimentBadge'
import type { SentimentSummary } from '@/types'

const summaryLabel: Record<SentimentSummary['label'], string> = {
  positive: 'Leaning positive',
  neutral: 'Roughly neutral',
  negative: 'Leaning negative',
  insufficient: 'Not enough data',
}

interface SentimentSummaryCardProps {
  summary: SentimentSummary
  className?: string
}

/**
 * Aggregate sentiment across a news feed. Explicitly a transparent
 * headline/summary lexicon signal — not an ML prediction and not advice.
 */
export function SentimentSummaryCard({ summary, className }: SentimentSummaryCardProps) {
  const { positive, neutral, negative, articleCount } = summary
  const denominator = Math.max(1, positive + neutral + negative)
  const insufficient = summary.label === 'insufficient'

  const segments = [
    { count: positive, className: 'bg-emerald-500/70', label: 'positive' },
    { count: neutral, className: 'bg-muted-foreground/40', label: 'neutral' },
    { count: negative, className: 'bg-red-500/70', label: 'negative' },
  ]

  return (
    <Card className={cn('space-y-3 p-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Sentiment</span>
          {summary.label === 'insufficient' ? (
            <Badge variant="neutral">Not enough data</Badge>
          ) : (
            <SentimentBadge sentiment={summary.label} />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {articleCount} article{articleCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={segment.className}
            style={{ width: `${(segment.count / denominator) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{positive}</span>{' '}
          positive
        </span>
        <span>
          <span className="font-semibold text-foreground">{neutral}</span> neutral
        </span>
        <span>
          <span className="font-semibold text-red-600 dark:text-red-400">{negative}</span>{' '}
          negative
        </span>
        {summary.score != null ? (
          <span className="ml-auto tabular-nums">
            Score {summary.score > 0 ? '+' : ''}
            {summary.score.toFixed(2)}
          </span>
        ) : null}
      </div>

      {insufficient ? (
        <p className="text-xs text-muted-foreground">
          At least 3 articles are needed for a meaningful reading.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {summaryLabel[summary.label]} · heuristic from headline/summary wording, not
          a price prediction.
        </p>
      )}
    </Card>
  )
}
