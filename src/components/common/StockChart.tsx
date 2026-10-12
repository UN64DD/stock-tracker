import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { ChartRange, HistoricalPoint } from '@/types'
import { chartRanges } from '@/mocks/history'

interface StockChartProps {
  data: HistoricalPoint[]
  gradientId: string
  positive?: boolean
  height?: number
  activeRange?: ChartRange
  onRangeChange?: (range: ChartRange) => void
  className?: string
}

interface TooltipPayloadEntry {
  value: number
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function ChartRangeSelector({
  activeRange,
  onRangeChange,
  className,
}: {
  activeRange: ChartRange
  onRangeChange: (range: ChartRange) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Chart time range"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1',
        className,
      )}
    >
      {chartRanges.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={activeRange === range}
          onClick={() => onRangeChange(range)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeRange === range
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {range}
        </button>
      ))}
    </div>
  )
}

export function StockChart({
  data,
  gradientId,
  positive = true,
  height = 300,
  activeRange,
  onRangeChange,
  className,
}: StockChartProps) {
  const values = data.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.12 || 1
  const domain: [number, number] = [
    Number((min - padding).toFixed(2)),
    Number((max + padding).toFixed(2)),
  ]

  const stroke = positive ? '#10b981' : '#ef4444'
  const fillTop = positive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {activeRange && onRangeChange ? (
        <div className="flex justify-end">
          <ChartRangeSelector
            activeRange={activeRange}
            onRangeChange={onRangeChange}
          />
        </div>
      ) : null}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={fillTop} />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-muted-foreground"
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-muted-foreground"
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
