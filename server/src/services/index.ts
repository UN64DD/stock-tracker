import type { AppConfig } from '../config.js'
import { ProviderBudget } from '../lib/budget.js'
import { TTLCache } from '../lib/cache.js'
import { createProvider } from '../providers/index.js'
import { MarketDataService } from './marketDataService.js'

export function createMarketDataService(config: AppConfig): MarketDataService {
  const provider = createProvider(config)
  const cache = new TTLCache()
  const budget = new ProviderBudget(config.providerCreditsPerMinute, config.providerCreditsPerDay)
  return new MarketDataService(provider, cache, config.cacheTtl, budget)
}

export { MarketDataService } from './marketDataService.js'
