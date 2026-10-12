import { NavLink } from 'react-router-dom'
import { ChartLine, PanelLeftClose, PanelLeft, X } from 'lucide-react'
import { adminNav, primaryNav, type NavItem } from '@/config/navigation'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate: () => void
}) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.title : undefined}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
          collapsed && 'lg:justify-center lg:px-2',
          isActive
            ? 'bg-slate-800 text-white'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className={cn('truncate', collapsed && 'lg:hidden')}>
        {item.title}
      </span>
    </NavLink>
  )
}

function SectionLabel({
  children,
  collapsed,
}: {
  children: string
  collapsed: boolean
}) {
  return (
    <p
      className={cn(
        'px-3 pb-1 pt-4 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500',
        collapsed && 'lg:text-center lg:text-[0.6rem]',
      )}
    >
      <span className={cn(collapsed && 'lg:hidden')}>{children}</span>
      {collapsed ? <span className="hidden lg:inline">•</span> : null}
    </p>
  )
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900 transition-all duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-svh lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-20' : 'lg:w-64',
        )}
        aria-label="Primary navigation"
      >
        <div
          className={cn(
            'flex h-16 items-center gap-2 border-b border-slate-800 px-4',
            collapsed && 'lg:justify-center lg:px-2',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <ChartLine className="size-5" aria-hidden="true" />
          </span>
          <div className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-semibold text-white">
              Stock Tracker
            </p>
            <p className="truncate text-[0.7rem] text-slate-400">
              Demo dashboard
            </p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <SectionLabel collapsed={collapsed}>Menu</SectionLabel>
          <div className="space-y-1">
            {primaryNav.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                collapsed={collapsed}
                onNavigate={onMobileClose}
              />
            ))}
          </div>

          <SectionLabel collapsed={collapsed}>Administration</SectionLabel>
          <div className="space-y-1">
            {adminNav.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                collapsed={collapsed}
                onNavigate={onMobileClose}
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div
            className={cn(
              'rounded-lg bg-slate-800/60 p-3 text-xs text-slate-400',
              collapsed && 'lg:hidden',
            )}
          >
            <p className="font-medium text-slate-200">Illustrative data only</p>
            <p className="mt-1 leading-relaxed">
              All prices, news, and alerts are mock values for UI testing.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'mt-3 hidden w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100 lg:flex',
              collapsed && 'lg:justify-center lg:px-2',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeft className="size-5" aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="size-5" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
