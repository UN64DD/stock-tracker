import { lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { ToastProvider } from '@/contexts/ToastProvider'
import { WatchlistProvider } from '@/contexts/WatchlistProvider'
import { AlertsProvider } from '@/contexts/AlertsProvider'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const ExploreStocksPage = lazy(() =>
  import('@/pages/ExploreStocksPage').then((module) => ({
    default: module.ExploreStocksPage,
  })),
)
const StockDetailsPage = lazy(() =>
  import('@/pages/StockDetailsPage').then((module) => ({
    default: module.StockDetailsPage,
  })),
)
const WatchlistPage = lazy(() =>
  import('@/pages/WatchlistPage').then((module) => ({
    default: module.WatchlistPage,
  })),
)
const PriceAlertsPage = lazy(() =>
  import('@/pages/PriceAlertsPage').then((module) => ({
    default: module.PriceAlertsPage,
  })),
)
const MarketNewsPage = lazy(() =>
  import('@/pages/MarketNewsPage').then((module) => ({
    default: module.MarketNewsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
)

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <WatchlistProvider>
          <AlertsProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route element={<DashboardLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="stocks" element={<ExploreStocksPage />} />
                  <Route path="stocks/:symbol" element={<StockDetailsPage />} />
                  <Route path="watchlist" element={<WatchlistPage />} />
                  <Route path="alerts" element={<PriceAlertsPage />} />
                  <Route path="news" element={<MarketNewsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="admin" element={<AdminDashboardPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AlertsProvider>
        </WatchlistProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
