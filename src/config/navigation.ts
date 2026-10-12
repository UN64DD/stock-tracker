import {
  BellRing,
  ChartLine,
  LayoutDashboard,
  Newspaper,
  Settings,
  ShieldCheck,
  Star,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  to: string
  icon: LucideIcon
  end?: boolean
  description: string
}

export const primaryNav: NavItem[] = [
  {
    title: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    end: true,
    description: 'Market overview',
  },
  {
    title: 'Explore Stocks',
    to: '/stocks',
    icon: ChartLine,
    description: 'Browse and filter symbols',
  },
  {
    title: 'My Watchlist',
    to: '/watchlist',
    icon: Star,
    description: 'Tracked symbols',
  },
  {
    title: 'Price Alerts',
    to: '/alerts',
    icon: BellRing,
    description: 'Demo alerts',
  },
  {
    title: 'Market News',
    to: '/news',
    icon: Newspaper,
    description: 'Illustrative headlines',
  },
  {
    title: 'Settings',
    to: '/settings',
    icon: Settings,
    description: 'Preferences',
  },
]

export const adminNav: NavItem[] = [
  {
    title: 'Admin Demo',
    to: '/admin',
    icon: ShieldCheck,
    description: 'Prototype admin panel',
  },
]
