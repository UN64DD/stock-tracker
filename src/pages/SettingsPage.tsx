import { useState } from 'react'
import {
  BellRing,
  CreditCard,
  Mail,
  Moon,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Sun,
  UserCog,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemoBadge } from '@/components/common/DemoBadge'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/contexts/toast-context'
import { useTheme, type Theme } from '@/contexts/theme-context'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { STORAGE_KEYS, removeStorage } from '@/lib/storage'
import { demoProfile } from '@/mocks/admin'
import { cn } from '@/lib/utils'

interface ProfileForm {
  name: string
  email: string
  role: string
}

type NotificationPreferences = Record<string, boolean>

const notificationOptions = [
  {
    key: 'priceAlerts',
    title: 'Price alert activity',
    description: 'Notify me when a demo alert condition is created or changed.',
  },
  {
    key: 'watchlistDigest',
    title: 'Watchlist digest',
    description: 'A mock summary of tracked symbols (no email is sent).',
  },
  {
    key: 'marketNews',
    title: 'Market news',
    description: 'Illustrative headlines for tracked symbols.',
  },
  {
    key: 'productUpdates',
    title: 'Product updates',
    description: 'Release notes for the Stock Tracker prototype.',
  },
]

const defaultNotificationPrefs: NotificationPreferences = {
  priceAlerts: true,
  watchlistDigest: true,
  marketNews: false,
  productUpdates: false,
}

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useLocalStorage<ProfileForm>(
    'stock-tracker:profile',
    {
      name: demoProfile.name,
      email: demoProfile.email,
      role: demoProfile.role,
    },
  )
  const [form, setForm] = useState<ProfileForm>(profile)
  const [prefs, setPrefs] = useLocalStorage<NotificationPreferences>(
    STORAGE_KEYS.preferences,
    defaultNotificationPrefs,
  )
  const [resetOpen, setResetOpen] = useState(false)

  const saveProfile = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: 'Name and email are required',
        variant: 'error',
      })
      return
    }
    setProfile(form)
    toast({
      title: 'Profile saved locally',
      description: 'Stored in this browser only — not sent to a server.',
      variant: 'success',
    })
  }

  const resetDemoData = () => {
    removeStorage(STORAGE_KEYS.watchlist)
    removeStorage(STORAGE_KEYS.alerts)
    removeStorage(STORAGE_KEYS.preferences)
    removeStorage(STORAGE_KEYS.adminStocks)
    removeStorage(STORAGE_KEYS.adminNews)
    removeStorage('stock-tracker:profile')
    toast({
      title: 'Demo data reset',
      description: 'Reloading with default mock data…',
    })
    window.setTimeout(() => window.location.reload(), 600)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Local prototype preferences. Nothing here requires real credentials."
        badge={<DemoBadge label="Local only" />}
      />

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <UserCog className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role</Label>
              <Input
                id="profile-role"
                value={form.role}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    role: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-plan">Plan</Label>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                <CreditCard className="size-4" aria-hidden="true" />
                {demoProfile.plan}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Profile changes save to localStorage only. Authentication arrives
              in a later phase.
            </p>
            <Button onClick={saveProfile}>
              <Save aria-hidden="true" />
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Palette className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          <div>
            <Label>Theme</Label>
            <div
              role="group"
              aria-label="Theme preference"
              className="mt-2 inline-flex flex-wrap gap-2"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon
                const active = theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Theme preference is applied immediately and saved to this browser.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <BellRing className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-3">
          {notificationOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {option.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <Switch
                checked={Boolean(prefs[option.key])}
                onCheckedChange={(checked) => {
                  setPrefs((previous) => ({ ...previous, [option.key]: checked }))
                  toast({
                    title: checked ? 'Preference enabled' : 'Preference disabled',
                    description: `${option.title} (stored locally)`,
                  })
                }}
                aria-label={`Toggle ${option.title}`}
              />
            </div>
          ))}

          <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                Email notifications
              </p>
              <p className="text-xs text-muted-foreground">
                Requires a backend and email provider. Planned for a later
                phase.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming soon
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <RefreshCw className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Demo data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Reset your watchlist, alerts, preferences, and admin demo edits back
            to the defaults.
          </p>
          <Button variant="outline" onClick={() => setResetOpen(true)}>
            <RefreshCw aria-hidden="true" />
            Reset demo data
          </Button>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="This clears saved watchlist, alerts, preferences, and edits from this browser. The page will reload with defaults."
        confirmLabel="Reset and reload"
        destructive
        onConfirm={resetDemoData}
      />
    </div>
  )
}
