import type { AppConfig } from '../config.js'
import { TwelveDataProvider } from './twelvedata.js'
import type { StockProvider } from './types.js'

export function createProvider(config: AppConfig): StockProvider {
  switch (config.provider) {
    case 'twelvedata':
      return new TwelveDataProvider(config.stockApiKey, config.requestTimeoutMs)
    default:
      throw new Error(`Unsupported STOCK_DATA_PROVIDER: "${config.provider}".`)
  }
}
