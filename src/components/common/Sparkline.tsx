import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface SparklineProps {
  values: number[]
  positive?: boolean
  className?: string
}

export function Sparkline({ values, positive, className }: SparklineProps) {
  if (values.length < 2) return null

  const isPositive =
    positive ?? values[values.length - 1] >= values[0]
  const stroke = isPositive ? '#10b981' : '#ef4444'
  const data = values.map((value, index) => ({ index, value }))

  return (
    <div className={cn('h-10 w-24', className)} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
