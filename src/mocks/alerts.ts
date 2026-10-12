import type { PriceAlert } from '@/types'
import { daysAgo } from './history'

export const defaultAlerts: PriceAlert[] = [
  {
    id: 'alert-demo-1',
    symbol: 'AAPL',
    condition: 'price_above',
    target: 240,
    enabled: true,
    createdAt: daysAgo(3),
  },
  {
    id: 'alert-demo-2',
    symbol: 'TSLA',
    condition: 'price_below',
    target: 220,
    enabled: true,
    createdAt: daysAgo(5),
  },
  {
    id: 'alert-demo-3',
    symbol: 'NVDA',
    condition: 'percent_increase',
    target: 5,
    enabled: false,
    createdAt: daysAgo(8),
  },
]

export const alertConditionLabels: Record<PriceAlert['condition'], string> = {
  price_above: 'Price above',
  price_below: 'Price below',
  percent_increase: 'Percentage increase',
  percent_decrease: 'Percentage decrease',
}
