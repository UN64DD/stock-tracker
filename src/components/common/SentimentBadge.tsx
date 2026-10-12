import { Badge } from '@/components/ui/badge'
import type { Sentiment } from '@/types'

const sentimentConfig: Record<
  Sentiment,
  { label: string; variant: 'positive' | 'negative' | 'neutral' }
> = {
  positive: { label: 'Positive', variant: 'positive' },
  negative: { label: 'Negative', variant: 'negative' },
  neutral: { label: 'Neutral', variant: 'neutral' },
}

export function SentimentBadge({
  sentiment,
  className,
}: {
  sentiment: Sentiment
  className?: string
}) {
  const config = sentimentConfig[sentiment]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
