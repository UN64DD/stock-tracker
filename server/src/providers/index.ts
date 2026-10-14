import type { AppConfig } from '../config.js'
import { FinnhubNewsProvider } from './finnhubNews.js'
import { TwelveDataProvider } from './twelvedata.js'
import type { NewsProvider } from './newsTypes.js'
import type { StockProvider } from './types.js'

export function createProvider(config: AppConfig): StockProvider {
  switch (config.provider) {
    case 'twelvedata':
      return new TwelveDataProvider(config.stockApiKey, config.requestTimeoutMs)
    default:
      throw new Error(`Unsupported STOCK_DATA_PROVIDER: "${config.provider}".`)
  }
}

export function createNewsProvider(config: AppConfig): NewsProvider {
  switch (config.newsProvider) {
    case 'finnhub':
      return new FinnhubNewsProvider(config.newsApiKey, config.requestTimeoutMs)
    default:
      throw new Error(`Unsupported NEWS_DATA_PROVIDER: "${config.newsProvider}".`)
  }
}

export type { NewsProvider } from './newsTypes.js'
export type { NormalizedNewsArticle } from './newsTypes.js'
