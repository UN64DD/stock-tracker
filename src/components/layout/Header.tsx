import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CircleUser,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { GlobalSearch } from '@/components/common/GlobalSearch'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { useToast } from '@/contexts/toast-context'
import { demoNotifications } from '@/mocks/admin'
import { formatRelativeTime } from '@/lib/format'
import type { AuthUser } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

function initialsFor(user: AuthUser): string {
  const source = user.displayName?.trim() || user.email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || 'U'
}

const toneDot: Record<Notification['tone'], string> = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  neutral: 'bg-slate-400',
}

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, signOut } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [notifications, setNotifications] =
    useState<Notification[]>(demoNotifications)
  const unreadCount = notifications.filter((item) => !item.read).length

  const markAllRead = () =>
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, read: true })),
    )

  const toggleRead = (id: string) =>
    setNotifications((previous) =>
      previous.map((item) =>
        item.id === id ? { ...item, read: !item.read } : item,
      ),
    )

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu aria-hidden="true" />
      </Button>

      <div className="hidden min-w-0 flex-1 sm:block">
        <GlobalSearch />
      </div>
      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </Button>

        <DropdownMenu
          label="Notifications"
          triggerClassName="relative rounded-lg p-2 hover:bg-accent"
          contentClassName="w-80"
          trigger={
            <>
              <Bell className="size-5 text-foreground" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-semibold text-destructive-foreground">
                  {unreadCount}
                </span>
              ) : null}
            </>
          }
        >
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleRead(item.id)}
                className={cn(
                  'flex w-full gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
                  !item.read && 'bg-accent/40',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    item.read ? 'bg-transparent' : toneDot[item.tone],
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] text-muted-foreground">
                    {formatRelativeTime(item.time)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <DropdownMenuSeparator />
          <p className="px-3 py-1.5 text-[0.7rem] text-muted-foreground">
            Demo notifications — no backend delivers these.
          </p>
        </DropdownMenu>

        {user ? (
          <DropdownMenu
            label="User menu"
            triggerClassName="rounded-full p-0.5 hover:bg-accent"
            trigger={
              <span className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {initialsFor(user)}
              </span>
            }
          >
            {(close) => (
              <>
                <DropdownMenuLabel>
                  <span className="block text-sm font-semibold text-foreground">
                    {user.displayName ?? user.email}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    close()
                    navigate('/settings')
                  }}
                >
                  <CircleUser aria-hidden="true" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    close()
                    navigate('/settings')
                  }}
                >
                  <Settings aria-hidden="true" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    close()
                    navigate('/admin')
                  }}
                >
                  <ShieldCheck aria-hidden="true" />
                  Admin demo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    close()
                    void signOut().then(() => {
                      toast({
                        title: 'Signed out',
                        description: 'Your watchlist stays saved to your account.',
                      })
                      navigate('/')
                    })
                  }}
                >
                  <LogOut aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
