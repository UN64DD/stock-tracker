import { ExternalLink, Newspaper } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
          <Badge variant="secondary">{article.category}</Badge>
          {article.ticker ? <Badge variant="outline">{article.ticker}</Badge> : null}
        </div>
        <DialogTitle className="mt-2">{article.headline}</DialogTitle>
        <DialogDescription>
          {article.source} · {formatDateTime(article.publishedAt)}
          {article.company ? ` · ${article.company}` : ''}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {article.summary}
        </p>
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <Newspaper className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            This is illustrative demo content. Headlines, sources, and summaries
            are fictional and do not represent real financial news.
          </span>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button
          variant="outline"
          disabled
          title="External links are disabled in this demo"
        >
          <ExternalLink aria-hidden="true" />
          Read full article (unavailable in demo)
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
