import type { AppConfig } from '../config.js'
import { ProviderBudget } from '../lib/budget.js'
import { TTLCache } from '../lib/cache.js'
import { createNewsProvider, createProvider } from '../providers/index.js'
import { MarketDataService } from './marketDataService.js'
import { NewsService } from './newsService.js'
import { createSentimentService } from './sentimentService.js'

export function createMarketDataService(config: AppConfig): MarketDataService {
  const provider = createProvider(config)
  const cache = new TTLCache()
  const budget = new ProviderBudget(config.providerCreditsPerMinute, config.providerCreditsPerDay)
  return new MarketDataService(provider, cache, config.cacheTtl, budget)
}

export function createNewsService(config: AppConfig): NewsService {
  const provider = createNewsProvider(config)
  const cache = new TTLCache()
  const budget = new ProviderBudget(config.newsCreditsPerMinute, config.newsCreditsPerDay)
  return new NewsService(
    provider,
    cache,
    config.cacheTtl.news,
    budget,
    createSentimentService(),
    config.newsPageSize,
  )
}

export { MarketDataService } from './marketDataService.js'
export { NewsService } from './newsService.js'
export type { NewsFeed, NewsArticleDto, NewsProviderInfo } from './newsService.js'
export { createSentimentService, LexiconSentimentService } from './sentimentService.js'
export type {
  SentimentService,
  SentimentSummary,
  SentimentLabel,
  ArticleSentiment,
} from './sentimentService.js'
