import { useState } from 'react'
import { BellRing, Plus, Trash } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { AlertForm, type AlertFormValues } from '@/components/common/AlertForm'
import { SymbolBadge } from '@/components/common/StockRow'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { useAlerts } from '@/contexts/alerts-context'
import { useToast } from '@/contexts/toast-context'
import { alertConditionLabels } from '@/mocks/alerts'
import { getStockBySymbol } from '@/lib/stocks'
import { formatCurrency, formatDateTime, formatTarget } from '@/lib/format'
import type { PriceAlert } from '@/types'

export function PriceAlertsPage() {
  const { alerts, addAlert, removeAlert, toggleAlert } = useAlerts()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PriceAlert | null>(null)

  const handleCreate = (values: AlertFormValues) => {
    addAlert(values)
    setCreateOpen(false)
    toast({
      title: 'Demo alert created',
      description: `${values.symbol} · ${alertConditionLabels[values.condition]}`,
      variant: 'success',
    })
  }

  const handleDelete = () => {
    if (!pendingDelete) return
    removeAlert(pendingDelete.id)
    toast({
      title: 'Alert deleted',
      description: `${pendingDelete.symbol} alert removed from demo storage.`,
    })
    setPendingDelete(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price Alerts"
        description="Create and manage illustrative alerts. These are front-end only and are never monitored or emailed."
        badge={<DemoBadge label="Not monitored" />}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            New alert
          </Button>
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Demo alerts do not trigger. There is no backend, no price polling, and
          no email delivery in Phase 1 — alerts simply persist in your browser.
        </p>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No alerts yet"
          description="Create a demo alert to try out the form and see it saved in this browser."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Create your first alert
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {alerts.map((alert) => {
            const stock = getStockBySymbol(alert.symbol)
            const isPercent =
              alert.condition === 'percent_increase' ||
              alert.condition === 'percent_decrease'
            return (
              <Card
                key={alert.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <SymbolBadge
                    symbol={alert.symbol}
                    accent={stock?.accent ?? '#64748b'}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {alert.symbol}
                      </p>
                      <span
                        className={
                          alert.enabled
                            ? 'inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400'
                            : 'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground'
                        }
                      >
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {alertConditionLabels[alert.condition]}{' '}
                      <span className="font-medium text-foreground">
                        {formatTarget(alert.target, isPercent)}
                      </span>
                      {stock ? ` · current ${formatCurrency(stock.price)}` : ''}
                    </p>
                    <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      Created {formatDateTime(alert.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={() => {
                        toggleAlert(alert.id)
                        toast({
                          title: alert.enabled
                            ? `${alert.symbol} alert disabled`
                            : `${alert.symbol} alert enabled`,
                        })
                      }}
                      aria-label={`Toggle ${alert.symbol} alert`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${alert.symbol} alert`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(alert)}
                  >
                    <Trash aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        aria-label="Create demo alert"
      >
        <DialogHeader>
          <DialogTitle>Create demo alert</DialogTitle>
          <DialogDescription>
            Set a rule for a mock symbol. Nothing is monitored — this only
            stores your input locally.
          </DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5">
          <AlertForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </div>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this alert?"
        description={`The ${pendingDelete?.symbol ?? ''} demo alert will be permanently removed from this browser.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}
