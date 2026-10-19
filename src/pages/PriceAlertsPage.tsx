import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  CheckCircle2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  SearchX,
  Trash,
} from 'lucide-react'
import { AlertForm, type AlertFormValues } from '@/components/common/AlertForm'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { SearchInput } from '@/components/common/SearchInput'
import { SymbolBadge } from '@/components/common/StockRow'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogBody, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAlerts } from '@/contexts/alerts-context'
import { useToast } from '@/contexts/toast-context'
import {
  alertStatusLabels,
  countAlertsByStatus,
  describeAlertRule,
  filterAlerts,
  notificationStatusLabels,
  type AlertStatusFilter,
} from '@/lib/alerts'
import { isApiError } from '@/lib/api'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format'
import { accentForSymbol } from '@/lib/liveStock'
import { cn } from '@/lib/utils'
import type { AlertNotification, AlertStatus, NotificationStatus, PriceAlert } from '@/types'

function messageFor(error: unknown): string {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return 'Please try again.'
}

const statusVariant: Record<AlertStatus, 'positive' | 'warning' | 'neutral'> = {
  active: 'positive',
  triggered: 'warning',
  disabled: 'neutral',
}

const notificationStatusVariant: Record<
  NotificationStatus,
  'neutral' | 'info' | 'positive' | 'negative'
> = {
  pending: 'neutral',
  accepted: 'info',
  delivered: 'positive',
  failed: 'negative',
}

const statusFilterOptions: Array<{ value: AlertStatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'triggered', label: 'Triggered' },
  { value: 'disabled', label: 'Disabled' },
]

export function PriceAlertsPage() {
  const {
    alerts,
    loading,
    error,
    isEvaluating,
    pendingIds,
    createAlert,
    updateAlert,
    removeAlert,
    setAlertEnabled,
    evaluateAlerts,
    refresh,
    notifications,
    notificationsLoading,
    notificationsError,
    pendingNotificationIds,
    refreshNotifications,
    resendNotification,
    priceAlertEmails,
    emailConfigured,
  } = useAlerts()
  const { toast } = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<PriceAlert | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PriceAlert | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all')
  const [query, setQuery] = useState('')

  const counts = countAlertsByStatus(alerts)
  const filtered = useMemo(
    () => filterAlerts(alerts, { status: statusFilter, query }),
    [alerts, statusFilter, query],
  )
  const hasFilters = statusFilter !== 'all' || query.trim().length > 0

  const handleCreate = async (values: AlertFormValues) => {
    setSubmitting(true)
    try {
      const alert = await createAlert(values)
      setCreateOpen(false)
      toast({
        title: 'Alert created',
        description: `${alert.symbol} · ${describeAlertRule(alert)}`,
        variant: 'success',
      })
    } catch (createError) {
      toast({
        title: 'Could not create alert',
        description: messageFor(createError),
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (values: AlertFormValues) => {
    if (!editing) return
    setSubmitting(true)
    try {
      await updateAlert(editing.id, {
        condition: values.condition,
        threshold: values.threshold,
        enabled: values.enabled,
      })
      setEditing(null)
      toast({
        title: `${values.symbol} alert updated`,
        description: describeAlertRule({
          condition: values.condition,
          threshold: values.threshold,
        }),
        variant: 'success',
      })
    } catch (updateError) {
      toast({
        title: 'Could not update alert',
        description: messageFor(updateError),
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    try {
      await removeAlert(target.id)
      toast({
        title: 'Alert deleted',
        description: `${target.symbol} alert removed from your account.`,
      })
    } catch (deleteError) {
      toast({
        title: 'Could not delete alert',
        description: messageFor(deleteError),
        variant: 'error',
      })
    }
  }

  const handleToggle = async (alert: PriceAlert) => {
    try {
      await setAlertEnabled(alert.id, !alert.enabled)
      toast({
        title: alert.enabled
          ? `${alert.symbol} alert disabled`
          : `${alert.symbol} alert enabled`,
        description: alert.enabled
          ? 'It will be skipped when checking.'
          : 'It will be checked against the latest price.',
      })
    } catch (toggleError) {
      toast({
        title: 'Could not update alert',
        description: messageFor(toggleError),
        variant: 'error',
      })
    }
  }

  const handleCheck = async () => {
    try {
      const next = await evaluateAlerts()
      const triggered = next.filter((alert) => alert.status === 'triggered').length
      toast({
        title: 'Alerts checked',
        description:
          triggered > 0
            ? `${triggered} of your alerts ${triggered === 1 ? 'has' : 'have'} triggered.`
            : 'No alert conditions are met yet.',
        variant: triggered > 0 ? 'warning' : 'success',
      })
    } catch (checkError) {
      toast({
        title: 'Could not check alerts',
        description: messageFor(checkError),
        variant: 'error',
      })
    }
  }

  const handleResend = async (notification: AlertNotification) => {
    try {
      const updated = await resendNotification(notification.id)
      toast({
        title: 'Email resent',
        description: `${updated.symbol} · ${notificationStatusLabels[updated.status]}`,
        variant: 'success',
      })
    } catch (resendError) {
      toast({
        title: 'Could not resend email',
        description: messageFor(resendError),
        variant: 'error',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price Alerts"
        description="Saved to your account. Check them whenever you like — the latest quote decides whether an alert triggers."
        badge={
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void handleCheck()}
              disabled={isEvaluating || alerts.length === 0}
            >
              <RefreshCw className={cn(isEvaluating && 'animate-spin')} aria-hidden="true" />
              Check now
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              New alert
            </Button>
          </div>
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-blue-800 dark:text-blue-300">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Alerts are evaluated when you press <strong>Check now</strong>.
          Percentage alerts compare the latest price with the session open of the
          current trading day.{' '}
          {priceAlertEmails
            ? 'When an alert triggers, an email is sent to your account address — you can turn that off in Settings.'
            : 'Email notifications are turned off in your settings, so triggers are only recorded here.'}
        </p>
      </div>

      {error && alerts.length === 0 ? (
        <EmptyState
          title="Could not load your alerts"
          description={messageFor(error)}
          action={<Button onClick={() => void refresh()}>Try again</Button>}
        />
      ) : loading && alerts.length === 0 ? (
        <LoadingState variant="rows" label="Loading your alerts…" />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No alerts yet"
          description="Create an alert to get a reminder when a price rises above, falls below, or moves by a chosen percentage."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" />
              Create your first alert
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {alerts.length}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {counts.active}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Triggered</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {counts.triggered}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Disabled</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-muted-foreground">
                {counts.disabled}
              </p>
            </Card>
          </div>

          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search by symbol or company…"
              aria-label="Search alerts by symbol"
              containerClassName="sm:max-w-xs sm:flex-1"
            />
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as AlertStatusFilter)
                }
                aria-label="Filter alerts by status"
                className="w-auto min-w-40"
              >
                {statusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all')
                    setQuery('')
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </Card>

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No matching alerts"
              description={
                hasFilters
                  ? 'None of your alerts match the current filters.'
                  : 'No alerts to show.'
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatusFilter('all')
                      setQuery('')
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3">
              {filtered.map((alert) => {
                const pending = pendingIds.includes(alert.id)
                return (
                  <Card key={alert.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <SymbolBadge
                        symbol={alert.symbol}
                        accent={accentForSymbol(alert.symbol)}
                        className="size-9"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/stocks/${alert.symbol}`}
                            className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {alert.symbol}
                          </Link>
                          {alert.name ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {alert.name}
                            </span>
                          ) : null}
                          <Badge variant={statusVariant[alert.status]}>
                            {alertStatusLabels[alert.status]}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {describeAlertRule(alert)}
                          {alert.lastPrice !== null ? (
                            <span className="text-muted-foreground/80">
                              {' '}
                              · last seen {formatCurrency(alert.lastPrice)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                          Created {formatDate(alert.createdAt)}
                          {alert.triggeredAt
                            ? ` · Triggered ${formatDateTime(alert.triggeredAt)}`
                            : ''}
                          {alert.lastCheckedAt
                            ? ` · Checked ${formatDateTime(alert.lastCheckedAt)}`
                            : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Enabled</span>
                        <Switch
                          checked={alert.enabled}
                          onCheckedChange={() => void handleToggle(alert)}
                          disabled={pending}
                          aria-label={`Toggle ${alert.symbol} alert`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${alert.symbol} alert`}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={pending}
                        onClick={() => setEditing(alert)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${alert.symbol} alert`}
                        className="text-muted-foreground hover:text-destructive"
                        disabled={pending}
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
        </>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="size-4" aria-hidden="true" />
              Email notifications
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              One email per trigger. &ldquo;Sent&rdquo; means the email provider
              accepted the message; &ldquo;Delivered&rdquo; is confirmed by the
              provider&apos;s webhook.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh notification history"
            disabled={notificationsLoading}
            onClick={() => void refreshNotifications()}
          >
            <RefreshCw
              className={cn(notificationsLoading && 'animate-spin')}
              aria-hidden="true"
            />
          </Button>
        </div>

        {!emailConfigured ? (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
            This server has no email provider configured (RESEND_API_KEY is
            unset), so trigger emails cannot be sent. Attempts are still recorded
            below with their failure reason.
          </div>
        ) : null}

        {notificationsError ? (
          <p className="mt-3 text-xs text-destructive">
            {messageFor(notificationsError)}
          </p>
        ) : null}

        {notificationsLoading && notifications.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Loading notification history…
          </p>
        ) : notifications.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No emails yet — they appear here after an alert triggers.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {notifications.map((notification) => {
              const resendPending = pendingNotificationIds.includes(notification.id)
              return (
                <li
                  key={notification.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/stocks/${notification.symbol}`}
                        className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {notification.symbol}
                      </Link>
                      {notification.companyName ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {notification.companyName}
                        </span>
                      ) : null}
                      <Badge variant={notificationStatusVariant[notification.status]}>
                        {notificationStatusLabels[notification.status]}
                      </Badge>
                      {notification.attempts > 1 ? (
                        <span className="text-[0.7rem] text-muted-foreground">
                          {notification.attempts} attempts
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {describeAlertRule(notification)} · triggered{' '}
                      {formatDateTime(notification.triggeredAt)}
                      {notification.triggerPrice !== null
                        ? ` at ${formatCurrency(notification.triggerPrice)}`
                        : ''}
                    </p>
                    <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      To {notification.recipientEmail}
                      {notification.acceptedAt
                        ? ` · accepted ${formatDateTime(notification.acceptedAt)}`
                        : ''}
                      {notification.deliveredAt
                        ? ` · delivered ${formatDateTime(notification.deliveredAt)}`
                        : ''}
                      {notification.status === 'failed' && notification.errorMessage
                        ? ` · ${notification.errorMessage}`
                        : ''}
                    </p>
                  </div>
                  {notification.status === 'failed' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={resendPending}
                      onClick={() => void handleResend(notification)}
                    >
                      <RotateCcw aria-hidden="true" />
                      Retry
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        aria-label="Create alert"
      >
        <DialogHeader>
          <DialogTitle>New price alert</DialogTitle>
          <DialogDescription>
            Pick a symbol, a condition, and a threshold. The alert is saved to
            your account.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <AlertForm
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create alert"
            submitting={submitting}
          />
        </DialogBody>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
        aria-label="Edit alert"
      >
        <DialogHeader>
          <DialogTitle>
            Edit {editing?.symbol ?? ''} alert
          </DialogTitle>
          <DialogDescription>
            Change the condition, threshold, or enabled state. Saving re-arms a
            triggered alert.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {editing ? (
            <AlertForm
              key={editing.id}
              initial={editing}
              onSubmit={handleEdit}
              onCancel={() => setEditing(null)}
              submitLabel="Save changes"
              submitting={submitting}
            />
          ) : null}
        </DialogBody>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this alert?"
        description={`The ${pendingDelete?.symbol ?? ''} alert will be permanently removed from your account.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
      />

      {alerts.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Open a symbol to see its chart, or use the switch to pause an alert
          without deleting it.
        </p>
      ) : null}
    </div>
  )
}
