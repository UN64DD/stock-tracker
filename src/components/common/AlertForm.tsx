import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { alertConditionLabels } from '@/mocks/alerts'
import { stocks } from '@/mocks/stocks'
import { cn } from '@/lib/utils'
import type { AlertCondition } from '@/types'

interface AlertFormValues {
  symbol: string
  condition: AlertCondition
  target: number
  enabled: boolean
}

interface AlertFormProps {
  onSubmit: (values: AlertFormValues) => void
  onCancel: () => void
  defaultSymbol?: string
}

const sortedStocks = [...stocks].sort((a, b) =>
  a.symbol.localeCompare(b.symbol),
)

const conditionOptions: AlertCondition[] = [
  'price_above',
  'price_below',
  'percent_increase',
  'percent_decrease',
]

export function AlertForm({
  onSubmit,
  onCancel,
  defaultSymbol,
}: AlertFormProps) {
  const [symbol, setSymbol] = useState(defaultSymbol ?? sortedStocks[0].symbol)
  const [condition, setCondition] = useState<AlertCondition>('price_above')
  const [target, setTarget] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [errors, setErrors] = useState<{ symbol?: string; target?: string }>({})

  const isPercent =
    condition === 'percent_increase' || condition === 'percent_decrease'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { symbol?: string; target?: string } = {}

    if (!symbol) {
      nextErrors.symbol = 'Choose a stock symbol.'
    }

    const numeric = Number(target)
    if (target.trim() === '' || Number.isNaN(numeric)) {
      nextErrors.target = 'Enter a numeric target value.'
    } else if (numeric <= 0) {
      nextErrors.target = 'Target must be greater than zero.'
    } else if (isPercent && numeric > 1000) {
      nextErrors.target = 'Percentage looks unrealistic for this demo.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    onSubmit({ symbol, condition, target: numeric, enabled })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="alert-symbol">Stock symbol</Label>
        <Select
          id="alert-symbol"
          value={symbol}
          onChange={(event) => {
            setSymbol(event.target.value)
            setErrors((previous) => ({ ...previous, symbol: undefined }))
          }}
        >
          {sortedStocks.map((stock) => (
            <option key={stock.symbol} value={stock.symbol}>
              {stock.symbol} — {stock.name}
            </option>
          ))}
        </Select>
        {errors.symbol ? (
          <p className="text-xs text-destructive">{errors.symbol}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-condition">Condition</Label>
        <Select
          id="alert-condition"
          value={condition}
          onChange={(event) => {
            setCondition(event.target.value as AlertCondition)
            setErrors((previous) => ({ ...previous, target: undefined }))
          }}
        >
          {conditionOptions.map((option) => (
            <option key={option} value={option}>
              {alertConditionLabels[option]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-target">
          Target {isPercent ? 'percentage' : 'price'}
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {isPercent ? '%' : '$'}
          </span>
          <Input
            id="alert-target"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value)
              setErrors((previous) => ({ ...previous, target: undefined }))
            }}
            placeholder={isPercent ? '5.00' : '250.00'}
            className={cn('pl-7', errors.target && 'border-destructive')}
            aria-invalid={Boolean(errors.target)}
            aria-describedby={errors.target ? 'alert-target-error' : undefined}
          />
        </div>
        {errors.target ? (
          <p id="alert-target-error" className="text-xs text-destructive">
            {errors.target}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Enabled</p>
          <p className="text-xs text-muted-foreground">
            Demo alerts are never actually monitored.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable alert"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create alert</Button>
      </div>
    </form>
  )
}

export type { AlertFormValues }
