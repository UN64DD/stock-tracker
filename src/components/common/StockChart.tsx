import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { chartRanges, formatObservationTimestamp, normalizeHistoryPoints } from '@/lib/chart'
import type { ChartRange, ChartType, HistoricalPoint } from '@/types'

interface StockChartProps {
  data: HistoricalPoint[]
  gradientId: string
  positive?: boolean
  height?: number
  activeRange?: ChartRange
  onRangeChange?: (range: ChartRange) => void
  chartType?: ChartType
  onChartTypeChange?: (type: ChartType) => void
  currency?: string
  className?: string
}

interface TooltipEntry {
  value?: number
  payload?: HistoricalPoint
}

function ChartTooltip({
  active,
  payload,
  currency = 'USD',
  intraday = false,
}: {
  active?: boolean
  payload?: TooltipEntry[]
  currency?: string
  intraday?: boolean
}) {
  const point = payload?.[0]?.payload
  const value = payload?.[0]?.value
  if (!active || !point || typeof value !== 'number') return null

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">
        {formatObservationTimestamp(point.timestamp, intraday)}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">
        {formatCurrency(value, currency)}
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
        'inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1',
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

export function ChartTypeSelector({
  chartType,
  onChartTypeChange,
  className,
}: {
  chartType: ChartType
  onChartTypeChange: (type: ChartType) => void
  className?: string
}) {
  const options: ChartType[] = ['area', 'line']
  return (
    <div
      role="group"
      aria-label="Chart display type"
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={chartType === option}
          onClick={() => onChartTypeChange(option)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            chartType === option
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
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
  chartType = 'area',
  onChartTypeChange,
  currency = 'USD',
  className,
}: StockChartProps) {
  const normalized = normalizeHistoryPoints(data)
  const intraday = activeRange ? activeRange === '1D' || activeRange === '1W' : false

  const values = normalized.map((point) => point.value)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const padding = (max - min) * 0.12 || 1
  const domain: [number, number] = [
    Number((min - padding).toFixed(2)),
    Number((max + padding).toFixed(2)),
  ]

  const stroke = positive ? '#10b981' : '#ef4444'
  const fillTop = positive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'
  const showControls = Boolean(activeRange && onRangeChange)
  const showTypeSelector = Boolean(onChartTypeChange)

  const axisElements = (
    <>
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
        width={72}
        tick={{ fontSize: 11, fill: 'currentColor' }}
        className="text-muted-foreground"
        tickFormatter={(value: number) => formatCurrency(value, currency)}
      />
      <Tooltip content={<ChartTooltip currency={currency} intraday={intraday} />} />
    </>
  )

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {showControls || showTypeSelector ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {showControls ? (
            <ChartRangeSelector
              activeRange={activeRange as ChartRange}
              onRangeChange={onRangeChange as (range: ChartRange) => void}
            />
          ) : (
            <span />
          )}
          {showTypeSelector ? (
            <ChartTypeSelector
              chartType={chartType}
              onChartTypeChange={onChartTypeChange as (type: ChartType) => void}
            />
          ) : null}
        </div>
      ) : null}

      <div style={{ height }} className="w-full">
        {normalized.length === 0 ? (
          <div
            className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
            role="status"
          >
            No price observations for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={normalized} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                {axisElements}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={stroke}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <AreaChart data={normalized} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fillTop} />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </linearGradient>
                </defs>
                {axisElements}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={stroke}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
