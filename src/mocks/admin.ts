import type { AdminActivity, Notification, UserProfile } from '@/types'
import { hoursAgo, minutesAgo } from './history'

export const adminActivities: AdminActivity[] = [
  {
    id: 'act-1',
    user: 'demo.analyst@example.com',
    action: 'Added stock to watchlist',
    target: 'NVDA',
    timestamp: minutesAgo(12),
    status: 'success',
  },
  {
    id: 'act-2',
    user: 'demo.analyst@example.com',
    action: 'Created price alert',
    target: 'AAPL',
    timestamp: minutesAgo(41),
    status: 'success',
  },
  {
    id: 'act-3',
    user: 'priya.sample@example.com',
    action: 'Updated profile preferences',
    target: 'Account',
    timestamp: hoursAgo(2),
    status: 'success',
  },
  {
    id: 'act-4',
    user: 'system.demo',
    action: 'Refreshed mock market snapshot',
    target: 'Indices',
    timestamp: hoursAgo(4),
    status: 'pending',
  },
  {
    id: 'act-5',
    user: 'marco.demo@example.com',
    action: 'Removed alert',
    target: 'TSLA',
    timestamp: hoursAgo(7),
    status: 'success',
  },
  {
    id: 'act-6',
    user: 'lena.sample@example.com',
    action: 'Attempted export',
    target: 'Watchlist CSV',
    timestamp: hoursAgo(11),
    status: 'failed',
  },
  {
    id: 'act-7',
    user: 'demo.analyst@example.com',
    action: 'Viewed stock details',
    target: 'MSFT',
    timestamp: hoursAgo(20),
    status: 'success',
  },
  {
    id: 'act-8',
    user: 'editor.demo@example.com',
    action: 'Published mock news entry',
    target: 'news-12',
    timestamp: hoursAgo(30),
    status: 'success',
  },
]

export const demoProfile: UserProfile = {
  name: 'Alex Demo',
  email: 'alex.demo@example.com',
  initials: 'AD',
  role: 'Demo Analyst',
  plan: 'Prototype Plan',
}

export const demoNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Demo alert triggered',
    description: 'AAPL crossed your $240 price target in the sample data.',
    time: minutesAgo(9),
    read: false,
    tone: 'positive',
  },
  {
    id: 'notif-2',
    title: 'Watchlist digest ready',
    description: 'A mock summary of your 5 tracked symbols is available.',
    time: hoursAgo(3),
    read: false,
    tone: 'neutral',
  },
  {
    id: 'notif-3',
    title: 'Mock news update',
    description: 'New illustrative headlines were added to the news feed.',
    time: hoursAgo(6),
    read: true,
    tone: 'neutral',
  },
  {
    id: 'notif-4',
    title: 'Demo alert paused',
    description: 'Your NVDA percentage alert was disabled in this prototype.',
    time: hoursAgo(28),
    read: true,
    tone: 'negative',
  },
]
