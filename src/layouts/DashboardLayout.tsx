import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoadingState } from '@/components/common/LoadingState'

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-muted/30">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((previous) => !previous)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Suspense
              fallback={<LoadingState variant="rows" label="Loading page…" />}
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          Stock Tracker — Phase 1 UI prototype. All market data, news, and
          alerts are illustrative mock values, not live financial information.
        </footer>
      </div>
    </div>
  )
}
