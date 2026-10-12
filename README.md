# Stock Tracker

A modern stock market dashboard with interactive charts, watchlists, price alerts, company news, and market insights.

> **Status:** Phase 1 — frontend UI prototype. The entire application runs on deterministic **mock data**. There is no backend, database, authentication, live stock API, email delivery, or background job. Everything is safe to click and explore without any API keys or paid services.

## Overview

Stock Tracker is a portfolio-quality frontend application built incrementally. Phase 0 established the project foundation; Phase 1 delivers a complete, responsive dashboard UI on top of it. The architecture is feature-oriented and keeps all mock data isolated so a future backend and external API can replace it cleanly.

## Technology Stack

| Concern         | Choice                          |
| --------------- | ------------------------------- |
| Frontend        | React 19 + TypeScript           |
| Build tool      | Vite                            |
| Styling         | Tailwind CSS v4                 |
| UI primitives   | Hand-rolled shadcn-style components |
| Icons           | Lucide React                    |
| Charts          | Recharts                        |
| Routing         | React Router                    |
| Code quality    | ESLint                          |
| Package manager | npm                             |

## Prerequisites

- [Node.js](https://nodejs.org/) 20.x or newer
- npm 10.x or newer
- Git

## Installation

```bash
git clone https://github.com/UN64DD/stock-tracker.git
cd stock-tracker
npm install
```

Optionally, copy the environment template (not required for Phase 1, which is entirely mock-driven):

```bash
cp .env.example .env
```

## Local Development

```bash
npm run dev
```

The dev server starts on the URL printed by Vite (default `http://localhost:5173`).

## Build

```bash
npm run build
```

Production output is written to `dist/`. Preview it locally with:

```bash
npm run preview
```

## Other Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `npm run lint`      | Run ESLint                        |
| `npm run typecheck` | Type-check without emitting files |

## Features (Phase 1)

### Layout & navigation

- Dark charcoal **collapsible sidebar** (desktop) and off-canvas drawer (mobile).
- Sticky top **header** with global stock search, notifications, theme toggle, and a mock user profile dropdown.
- Reusable **page header** with contextual actions.
- Fully **responsive** across desktop, tablet, and mobile.

### Pages

| Route             | Page            | Highlights |
| ----------------- | --------------- | ---------- |
| `/`               | Dashboard       | Market summary cards (S&P 500, NASDAQ, Dow Jones, Russell 2000), watchlist preview, interactive main market chart, top gainers/losers, latest news. |
| `/stocks`         | Explore Stocks  | Search, sector filter, sortable table, empty state. |
| `/stocks/:symbol` | Stock Details   | Price, change, interactive chart with range selector, key statistics, company overview, related news, watchlist toggle. |
| `/watchlist`      | Watchlist       | Search within saved symbols, remove with confirmation, price changes. |
| `/alerts`         | Price Alerts    | Create alerts (validated), enable/disable, delete with confirmation. |
| `/news`           | Market News     | Category and sentiment filters, search, article detail dialog. |
| `/settings`       | Settings        | Local profile, theme, notification preferences, reset demo data. |
| `/admin`          | Admin Dashboard | Mock stats, recent activity, stock metadata management, news entry management. |
| `*`               | Not Found       | Helpful 404 page. |

### Interactive behaviors

- Working global and page-level stock search.
- Working filters and multi-column sorting.
- Working chart time-range selection (**1D / 1W / 1M / 3M / 1Y**) that regenerates the chart data.
- Watchlist add/remove with duplicate prevention.
- Alert create/toggle/delete with field validation.
- Toast notifications, empty states, loading states, error states.
- Confirmation dialogs before destructive actions.
- Consistent price/percentage formatting and accessible labels.

## Mock data

All data lives in `src/mocks/` and is deterministic — the same values render on every reload (no `Math.random()` at render time):

- `stocks.ts` — ~30 mock stocks with fundamentals.
- `indices.ts` — S&P 500, NASDAQ, Dow Jones, Russell 2000.
- `history.ts` — a seeded (mulberry32) historical-series generator plus `DEMO_NOW`, so charts are stable and reproducible per symbol/range.
- `news.ts` — fictional, clearly labelled news articles.
- `alerts.ts` — example demo alerts and condition labels.
- `admin.ts` — mock admin activity, demo profile, and notifications.

Shared TypeScript types live in `src/types/index.ts`. Nothing in `src/mocks/` imports from components, so mock modules can be swapped for real API calls later.

## localStorage (temporary frontend persistence)

The following demo state is persisted in your browser via `localStorage`. This is **not** real multi-user storage — clearing site data or using another browser resets it:

| Data                         | Storage key                     |
| ---------------------------- | ------------------------------- |
| Watchlist symbols            | `stock-tracker:watchlist`       |
| Price alerts                 | `stock-tracker:alerts`          |
| Theme preference             | `stock-tracker:theme`           |
| Notification preferences     | `stock-tracker:preferences`     |
| Admin-managed stock metadata | `stock-tracker:admin-stocks`    |
| Admin-managed news entries   | `stock-tracker:admin-news`      |
| Local profile                | `stock-tracker:profile`         |

Use **Settings → Demo data → Reset demo data** to clear everything and reload defaults.

## Limitations of the demo

- No authentication or real user accounts.
- No database or server persistence.
- No live or real market data (values are fictional and may not be realistic).
- No API integrations or background jobs.
- Price alerts are never monitored and no emails are sent.
- News headlines, sources, and links are fictional; external article links are disabled placeholders.
- The admin dashboard is an openly accessible visual prototype with **no authorization**.
- Passwords are never requested or stored.

## Testing the interface

1. `npm install && npm run dev`.
2. Visit `/` — verify market summary cards, chart range buttons change the chart, and watchlist preview rows link to details.
3. Go to `/stocks`, type `NVDA` in the search box, and try sorting by clicking table headers. Search for `zzzz` to see the empty state.
4. Open a stock (e.g. `/stocks/AAPL`), toggle **Add to watchlist**, then visit `/watchlist` and confirm it appears.
5. On `/watchlist`, remove a symbol and confirm the dialog. Refresh the page — changes persist.
6. On `/alerts`, create an alert (try a negative target to see validation), toggle it, and delete it. Refresh — changes persist.
7. On `/news`, filter by category/sentiment and open an article detail dialog.
8. On `/settings`, switch the theme and change notification toggles, then refresh.
9. On `/admin`, add/remove stock metadata and create/edit a news entry.
10. Resize the browser to a mobile width and confirm the sidebar collapses into a drawer with no horizontal scrolling.

## Project Structure

```text
stock-tracker/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── common/         # Reusable domain components (StatCard, StockChart, …)
│   │   ├── layout/         # Sidebar, Header, PageHeader
│   │   └── ui/             # shadcn-style primitives
│   ├── config/             # Navigation config
│   ├── contexts/           # Watchlist, Alerts, Toast, Theme providers
│   ├── hooks/              # useLocalStorage
│   ├── layouts/            # DashboardLayout (route layout)
│   ├── lib/                # cn, formatting, storage, stock selectors
│   ├── mocks/              # Deterministic mock data
│   ├── pages/              # Route pages
│   ├── types/              # Shared TypeScript types
│   ├── App.tsx             # Router + providers
│   └── main.tsx
├── components.json         # shadcn/ui configuration
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

The `@/*` import alias points at `src/`.

## Planned Development Phases

1. Project foundation and UI ✅
2. Authentication and database
3. Stock search and stock data API
4. Interactive charts and company fundamentals
5. Persistent watchlists
6. News and market sentiment
7. Price alerts
8. Email notifications
9. Background workflows
10. Admin dashboard
11. UI polish
12. Testing and deployment

## License

Not yet specified.
