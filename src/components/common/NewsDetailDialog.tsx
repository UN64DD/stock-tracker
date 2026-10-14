import { ExternalLink, Newspaper } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import type { NewsArticle } from '@/types'
import { SentimentBadge } from './SentimentBadge'

interface NewsDetailDialogProps {
  article: NewsArticle | null
  onOpenChange: (open: boolean) => void
}

export function NewsDetailDialog({
  article,
  onOpenChange,
}: NewsDetailDialogProps) {
  if (!article) return null

  return (
    <Dialog
      open={Boolean(article)}
      onOpenChange={onOpenChange}
      aria-label={article.headline}
    >
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <SentimentBadge sentiment={article.sentiment} />
          <Badge variant="secondary" className="capitalize">
            {article.category}
          </Badge>
          {article.tickers.map((ticker) => (
            <Badge key={ticker} variant="outline">
              {ticker}
            </Badge>
          ))}
        </div>
        <DialogTitle className="mt-2">{article.headline}</DialogTitle>
        <DialogDescription>
          {article.source} · {formatDateTime(article.publishedAt)} · score{' '}
          {article.sentimentScore > 0 ? '+' : ''}
          {article.sentimentScore.toFixed(2)}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        {article.thumbnail ? (
          <img
            src={article.thumbnail}
            alt=""
            className="max-h-64 w-full rounded-lg object-cover"
          />
        ) : null}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {article.summary ?? 'No summary was provided for this article.'}
        </p>
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Newspaper className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Sentiment is a transparent lexicon score derived from the headline and
            summary wording. It is not investment advice or a price prediction.
          </span>
        </div>
      </DialogBody>
      <DialogFooter>
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants())}
          >
            <ExternalLink aria-hidden="true" />
            Read full article
          </a>
        ) : (
          <span
            className={cn(buttonVariants({ variant: 'outline' }), 'pointer-events-none opacity-60')}
          >
            <ExternalLink aria-hidden="true" />
            No link available
          </span>
        )}
      </DialogFooter>
    </Dialog>
  )
}
