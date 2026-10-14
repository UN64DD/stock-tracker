/* eslint-disable react-hooks/set-state-in-effect -- This hook intentionally mirrors paginated async fetch state into React state. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ApiEnvelope, ApiMeta } from '@/lib/api'
import { mergeNewsArticles } from '@/lib/news'
import type { NewsArticle, NewsFeed, SentimentSummary } from '@/types'

export interface NewsFeedState {
  /** All fetched pages merged newest-first, with duplicates removed. */
  articles: NewsArticle[]
  /** Aggregate across the full fetched set (identical on every page). */
  sentiment: SentimentSummary | null
  meta: ApiMeta | null
  total: number
  hasMore: boolean
  loading: boolean
  loadingMore: boolean
  error: unknown
  loadMore: () => void
  reload: () => void
}

/**
 * Loads a paginated news feed, accumulating pages as the user asks for more.
 * The first page reloads whenever `deps` change; a provider failure on load
 * more keeps the articles already shown.
 */
export function useNewsFeed(
  fetchPage: (page: number, signal: AbortSignal) => Promise<ApiEnvelope<NewsFeed>>,
  deps: readonly unknown[],
  enabled = true,
): NewsFeedState {
  const fetchRef = useRef(fetchPage)

  useEffect(() => {
    fetchRef.current = fetchPage
  })

  const [feeds, setFeeds] = useState<NewsFeed[]>([])
  const [meta, setMeta] = useState<ApiMeta | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!enabled) {
      setFeeds([])
      setMeta(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let active = true
    setFeeds([])
    setError(null)
    setLoading(true)

    fetchRef
      .current(1, controller.signal)
      .then((envelope) => {
        if (!active) return
        setFeeds([envelope.data])
        setMeta(envelope.meta)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!active || controller.signal.aborted) return
        setError(caught)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, reloadToken])

  const loadMore = useCallback(() => {
    if (!enabled || loading || loadingMore) return
    const last = feeds[feeds.length - 1]
    if (!last?.hasMore) return

    const nextPage = last.page + 1
    setLoadingMore(true)

    fetchRef
      .current(nextPage, new AbortController().signal)
      .then((envelope) => {
        setFeeds((previous) => [...previous, envelope.data])
        setMeta(envelope.meta)
        setError(null)
      })
      .catch((caught: unknown) => {
        setError((previous: unknown) => previous ?? caught)
      })
      .finally(() => setLoadingMore(false))
  }, [enabled, loading, loadingMore, feeds])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  const articles = useMemo(
    () => mergeNewsArticles(...feeds.map((feed) => feed.articles)),
    [feeds],
  )
  const first = feeds[0]

  return {
    articles,
    sentiment: first?.sentiment ?? null,
    meta,
    total: first?.total ?? 0,
    hasMore: feeds[feeds.length - 1]?.hasMore ?? false,
    loading,
    loadingMore,
    error,
    loadMore,
    reload,
  }
}
