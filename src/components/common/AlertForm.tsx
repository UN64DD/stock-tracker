import { useState, type FormEvent } from 'react'
import { AlertSymbolPicker, type AlertSymbolSelection } from '@/components/common/AlertSymbolPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  alertConditionLabels,
  isPercentCondition,
} from '@/lib/alerts'
import { cn } from '@/lib/utils'
import type { AlertCondition, PriceAlert } from '@/types'

export interface AlertFormValues extends AlertSymbolSelection {
  condition: AlertCondition
  threshold: number
  enabled: boolean
}

interface AlertFormProps {
  onSubmit: (values: AlertFormValues) => void | Promise<void>
  onCancel: () => void
  /** When present, the form edits the alert: the symbol is locked. */
  initial?: PriceAlert | null
  submitLabel?: string
  submitting?: boolean
}

const conditionOptions: AlertCondition[] = [
  'price_above',
  'price_below',
  'percent_increase',
  'percent_decrease',
]

const MAX_PERCENT_THRESHOLD = 1000
const MAX_PRICE_THRESHOLD = 1_000_000_000

export function AlertForm({
  onSubmit,
  onCancel,
  initial,
  submitLabel = 'Create alert',
  submitting = false,
}: AlertFormProps) {
  const isEditing = Boolean(initial)
  const [selection, setSelection] = useState<AlertSymbolSelection | null>(
    initial
      ? {
          symbol: initial.symbol,
          name: initial.name,
          currency: null,
          exchange: null,
        }
      : null,
  )
  const [condition, setCondition] = useState<AlertCondition>(
    initial?.condition ?? 'price_above',
  )
  const [threshold, setThreshold] = useState(
    initial ? String(initial.threshold) : '',
  )
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [errors, setErrors] = useState<{
    symbol?: string
    threshold?: string
  }>({})

  const isPercent = isPercentCondition(condition)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { symbol?: string; threshold?: string } = {}

    if (!selection?.symbol) {
      nextErrors.symbol = 'Choose a stock symbol.'
    }

    const numeric = Number(threshold)
    if (threshold.trim() === '' || Number.isNaN(numeric)) {
      nextErrors.threshold = 'Enter a numeric target value.'
    } else if (numeric <= 0) {
      nextErrors.threshold = isPercent
        ? 'Percentage must be greater than zero.'
        : 'Price must be a positive value.'
    } else if (isPercent && numeric > MAX_PERCENT_THRESHOLD) {
      nextErrors.threshold = 'Percentage looks unrealistic (max 1000%).'
    } else if (!isPercent && numeric > MAX_PRICE_THRESHOLD) {
      nextErrors.threshold = 'Price looks unrealistically large.'
    }

    if (Object.keys(nextErrors).length > 0 || !selection) {
      setErrors(nextErrors)
      return
    }

    void onSubmit({
      symbol: selection.symbol,
      name: selection.name,
      currency: selection.currency,
      exchange: selection.exchange,
      condition,
      threshold: numeric,
      enabled,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="alert-symbol-input">Stock symbol</Label>
        <AlertSymbolPicker
          value={selection}
          onChange={(next) => {
            setSelection(next)
            setErrors((previous) => ({ ...previous, symbol: undefined }))
          }}
          disabled={isEditing}
          invalid={Boolean(errors.symbol)}
          describedBy={errors.symbol ? 'alert-symbol-error' : undefined}
        />
        {isEditing ? (
          <p className="text-xs text-muted-foreground">
            The symbol of an alert cannot be changed. Create a new alert for a
            different symbol.
          </p>
        ) : null}
        {errors.symbol ? (
          <p id="alert-symbol-error" className="text-xs text-destructive">
            {errors.symbol}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="alert-condition">Condition</Label>
        <Select
          id="alert-condition"
          value={condition}
          onChange={(event) => {
            setCondition(event.target.value as AlertCondition)
            setErrors((previous) => ({ ...previous, threshold: undefined }))
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
            min="0.01"
            value={threshold}
            onChange={(event) => {
              setThreshold(event.target.value)
              setErrors((previous) => ({ ...previous, threshold: undefined }))
            }}
            placeholder={isPercent ? '5.00' : '250.00'}
            className={cn('pl-7', errors.threshold && 'border-destructive')}
            aria-invalid={Boolean(errors.threshold)}
            aria-describedby={errors.threshold ? 'alert-target-error' : undefined}
          />
        </div>
        {errors.threshold ? (
          <p id="alert-target-error" className="text-xs text-destructive">
            {errors.threshold}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {isPercent
            ? 'Measured from the session open of the current trading day.'
            : 'Compared with the latest available price.'}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <p className="text-sm font-medium text-foreground">Enabled</p>
          <p className="text-xs text-muted-foreground">
            Disabled alerts are skipped when checking.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Enable alert"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
