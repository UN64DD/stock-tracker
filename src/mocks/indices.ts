import type { MarketIndex } from '@/types'

interface RawIndex extends Omit<MarketIndex, 'change' | 'changePercent'> {
  previousClose: number
}

const rawIndices: RawIndex[] = [
  { symbol: '^GSPC', name: 'S&P 500', value: 5746.32, previousClose: 5712.18 },
  { symbol: '^IXIC', name: 'NASDAQ Composite', value: 18342.94, previousClose: 18160.47 },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', value: 42214.68, previousClose: 42311.05 },
  { symbol: '^RUT', name: 'Russell 2000', value: 2204.51, previousClose: 2189.62 },
]

export const marketIndices: MarketIndex[] = rawIndices.map(
  ({ previousClose, ...index }) => {
    const change = Number((index.value - previousClose).toFixed(2))
    const changePercent = Number(((change / previousClose) * 100).toFixed(2))
    return { ...index, change, changePercent }
  },
)
