import { useState, type FormEvent } from 'react'
import {
  Activity,
  BellRing,
  ChartLine,
  Pencil,
  Plus,
  ShieldCheck,
  Trash,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { SentimentBadge } from '@/components/common/SentimentBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/contexts/toast-context'
import { useAlerts } from '@/contexts/alerts-context'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS } from '@/lib/storage'
import { adminActivities } from '@/mocks/admin'
import { newsArticles, newsCategories, newsSources } from '@/mocks/news'
import { stocks } from '@/mocks/stocks'
import { formatRelativeTime } from '@/lib/format'
import type { NewsCategory, Sentiment } from '@/types'

interface ManagedStock {
  symbol: string
  name: string
  sector: string
}

interface ManagedNews {
  id: string
  headline: string
  source: string
  category: NewsCategory
  sentiment: Sentiment
}

const seedStocks: ManagedStock[] = stocks
  .slice(0, 8)
  .map(({ symbol, name, sector }) => ({ symbol, name, sector }))

const seedNews: ManagedNews[] = newsArticles
  .slice(0, 5)
  .map(({ id, headline, source, category, sentiment }) => ({
    id,
    headline,
    source,
    category,
    sentiment,
  }))

const sentimentOptions: Sentiment[] = ['positive', 'neutral', 'negative']

const activityStatusStyles: Record<string, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  pending: 'text-amber-600 dark:text-amber-400',
  failed: 'text-red-600 dark:text-red-400',
}

export function AdminDashboardPage() {
  const { toast } = useToast()
  const { alerts } = useAlerts()
  const [managedStocks, setManagedStocks] = useLocalStorage<ManagedStock[]>(
    STORAGE_KEYS.adminStocks,
    seedStocks,
  )
  const [managedNews, setManagedNews] = useLocalStorage<ManagedNews[]>(
    STORAGE_KEYS.adminNews,
    seedNews,
  )

  const [newStock, setNewStock] = useState<ManagedStock>({
    symbol: '',
    name: '',
    sector: '',
  })
  const [stockError, setStockError] = useState('')
  const [pendingStock, setPendingStock] = useState<string | null>(null)

  const [editingNews, setEditingNews] = useState<ManagedNews | null>(null)
  const [newsDialogOpen, setNewsDialogOpen] = useState(false)
  const [pendingNews, setPendingNews] = useState<string | null>(null)

  const activeAlerts = alerts.filter((alert) => alert.enabled).length

  const handleAddStock = (event: FormEvent) => {
    event.preventDefault()
    const symbol = newStock.symbol.trim().toUpperCase()
    const name = newStock.name.trim()
    const sector = newStock.sector.trim() || 'Uncategorized'

    if (!symbol || !name) {
      setStockError('Symbol and company name are required.')
      return
    }
    if (managedStocks.some((stock) => stock.symbol === symbol)) {
      setStockError(`${symbol} already exists in managed stocks.`)
      return
    }
    setManagedStocks((previous) => [...previous, { symbol, name, sector }])
    setNewStock({ symbol: '', name: '', sector: '' })
    setStockError('')
    toast({
      title: `${symbol} added to managed stocks`,
      description: 'Demo metadata stored locally.',
      variant: 'success',
    })
  }

  const openNewNews = () => {
    setEditingNews({
      id: `news-admin-${Date.now()}`,
      headline: '',
      source: newsSources[0],
      category: 'Markets',
      sentiment: 'neutral',
    })
    setNewsDialogOpen(true)
  }

  const openEditNews = (article: ManagedNews) => {
    setEditingNews(article)
    setNewsDialogOpen(true)
  }

  const saveNews = () => {
    if (!editingNews) return
    if (!editingNews.headline.trim()) {
      toast({ title: 'Headline is required', variant: 'error' })
      return
    }
    setManagedNews((previous) => {
      const exists = previous.some((item) => item.id === editingNews.id)
      return exists
        ? previous.map((item) =>
            item.id === editingNews.id ? editingNews : item,
          )
        : [...previous, editingNews]
    })
    setNewsDialogOpen(false)
    setEditingNews(null)
    toast({
      title: 'Mock news entry saved',
      description: 'Stored in this browser only.',
      variant: 'success',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="A visual prototype of an admin surface. There is no authentication and no real authorization."
        badge={<DemoBadge label="Unprotected demo" />}
      />

      <div className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-800 dark:text-blue-300">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          This page is intentionally accessible to everyone in the prototype. It
          does not represent a secure admin system.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value="2,481" icon={Users} footer="Mock metric" />
        <StatCard
          label="Active users (24h)"
          value="612"
          icon={Activity}
          footer="Mock metric"
        />
        <StatCard
          label="Tracked stocks"
          value={String(managedStocks.length)}
          icon={ChartLine}
          footer="From managed metadata"
        />
        <StatCard
          label="Active alerts"
          value={String(activeAlerts)}
          icon={BellRing}
          footer="From your demo alerts"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden sm:table-cell">Target</TableHead>
                <TableHead className="hidden md:table-cell">When</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium text-foreground">
                    {activity.user}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {activity.action}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {activity.target}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatRelativeTime(activity.timestamp)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium capitalize ${activityStatusStyles[activity.status]}`}
                  >
                    {activity.status}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock management</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add or remove mock stock metadata. Saved locally.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-3">
            <form
              onSubmit={handleAddStock}
              className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3"
            >
              <div className="space-y-1">
                <Label htmlFor="admin-symbol" className="text-xs">
                  Symbol
                </Label>
                <Input
                  id="admin-symbol"
                  value={newStock.symbol}
                  onChange={(event) =>
                    setNewStock((previous) => ({
                      ...previous,
                      symbol: event.target.value,
                    }))
                  }
                  placeholder="ABCD"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-name" className="text-xs">
                  Company
                </Label>
                <Input
                  id="admin-name"
                  value={newStock.name}
                  onChange={(event) =>
                    setNewStock((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Example Corp."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-sector" className="text-xs">
                  Sector
                </Label>
                <Input
                  id="admin-sector"
                  value={newStock.sector}
                  onChange={(event) =>
                    setNewStock((previous) => ({
                      ...previous,
                      sector: event.target.value,
                    }))
                  }
                  placeholder="Technology"
                />
              </div>
              <div className="sm:col-span-3">
                {stockError ? (
                  <p className="mb-2 text-xs text-destructive">{stockError}</p>
                ) : null}
                <Button type="submit" size="sm">
                  <Plus aria-hidden="true" />
                  Add stock metadata
                </Button>
              </div>
            </form>

            {managedStocks.length === 0 ? (
              <EmptyState
                title="No managed stocks"
                description="Add mock stock metadata using the form above."
                className="py-8"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden sm:table-cell">Sector</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managedStocks.map((stock) => (
                    <TableRow key={stock.symbol}>
                      <TableCell className="font-semibold text-foreground">
                        {stock.symbol}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {stock.name}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {stock.sector}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${stock.symbol}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingStock(stock.symbol)}
                        >
                          <Trash aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>News management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create or edit fictional news entries.
              </p>
            </div>
            <Button size="sm" onClick={openNewNews}>
              <Plus aria-hidden="true" />
              New entry
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {managedNews.length === 0 ? (
              <EmptyState
                title="No news entries"
                description="Create a mock news entry to manage it here."
                className="py-8"
              />
            ) : (
              managedNews.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {article.headline || 'Untitled entry'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <SentimentBadge sentiment={article.sentiment} />
                      <span className="text-xs text-muted-foreground">
                        {article.category} · {article.source}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit news entry"
                      className="text-muted-foreground"
                      onClick={() => openEditNews(article)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete news entry"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingNews(article.id)}
                    >
                      <Trash aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={newsDialogOpen}
        onOpenChange={(open) => {
          setNewsDialogOpen(open)
          if (!open) setEditingNews(null)
        }}
        aria-label="News entry editor"
      >
        <DialogHeader>
          <DialogTitle>News entry</DialogTitle>
          <DialogDescription>
            Fictional content stored only in this browser.
          </DialogDescription>
        </DialogHeader>
        {editingNews ? (
          <>
            <div className="space-y-4 px-5 pb-5">
              <div className="space-y-2">
                <Label htmlFor="news-headline">Headline</Label>
                <Input
                  id="news-headline"
                  value={editingNews.headline}
                  onChange={(event) =>
                    setEditingNews({
                      ...editingNews,
                      headline: event.target.value,
                    })
                  }
                  placeholder="Demo: your illustrative headline"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="news-source">Source</Label>
                  <Select
                    id="news-source"
                    value={editingNews.source}
                    onChange={(event) =>
                      setEditingNews({
                        ...editingNews,
                        source: event.target.value,
                      })
                    }
                  >
                    {newsSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="news-category">Category</Label>
                  <Select
                    id="news-category"
                    value={editingNews.category}
                    onChange={(event) =>
                      setEditingNews({
                        ...editingNews,
                        category: event.target.value as NewsCategory,
                      })
                    }
                  >
                    {newsCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="news-sentiment">Sentiment</Label>
                  <Select
                    id="news-sentiment"
                    value={editingNews.sentiment}
                    onChange={(event) =>
                      setEditingNews({
                        ...editingNews,
                        sentiment: event.target.value as Sentiment,
                      })
                    }
                  >
                    {sentimentOptions.map((sentiment) => (
                      <option key={sentiment} value={sentiment}>
                        {sentiment}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setNewsDialogOpen(false)
                  setEditingNews(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveNews}>Save entry</Button>
            </DialogFooter>
          </>
        ) : null}
      </Dialog>

      <ConfirmationDialog
        open={Boolean(pendingStock)}
        onOpenChange={(open) => {
          if (!open) setPendingStock(null)
        }}
        title="Remove stock metadata?"
        description={`${pendingStock ?? 'This symbol'} will be removed from the demo managed list.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          setManagedStocks((previous) =>
            previous.filter((stock) => stock.symbol !== pendingStock),
          )
          setPendingStock(null)
          toast({ title: 'Stock metadata removed' })
        }}
      />

      <ConfirmationDialog
        open={Boolean(pendingNews)}
        onOpenChange={(open) => {
          if (!open) setPendingNews(null)
        }}
        title="Delete news entry?"
        description="This fictional entry will be removed from the demo list."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setManagedNews((previous) =>
            previous.filter((item) => item.id !== pendingNews),
          )
          setPendingNews(null)
          toast({ title: 'News entry deleted' })
        }}
      />
    </div>
  )
}
