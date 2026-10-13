# Stock Tracker

A modern stock market dashboard with interactive charts, watchlists, price alerts, company news, and market insights.

> **Status:** Phase 3 — live market data via a server-side API proxy. Stock **search, quotes, price history, and (limited) company profiles** are fetched live from [Twelve Data](https://twelvedata.com/) through a small Express server that keeps the API key out of the browser. Market indices, news, alerts, admin, and watchlist storage remain deterministic **mock data** (there is still no database, authentication, or background job). See [Market data API (Phase 3)](#market-data-api-phase-3).

## Overview

Stock Tracker is a portfolio-quality application built incrementally. Phase 0 established the project foundation; Phase 1 delivered a complete, responsive dashboard UI; Phase 3 wires a real market data provider in through a server-side proxy. The architecture is feature-oriented and keeps remaining mock data isolated so it can be replaced cleanly later.

## Technology Stack

| Concern          | Choice                          |
| ---------------- | ------------------------------- |
| Frontend         | React 19 + TypeScript           |
| Build tool       | Vite                            |
| Styling          | Tailwind CSS v4                 |
| UI primitives    | Hand-rolled shadcn-style components |
| Icons            | Lucide React                    |
| Charts           | Recharts                        |
| Routing          | React Router                    |
| API proxy server | Node + Express (TypeScript)     |
| Market data      | Twelve Data (free Basic tier)   |
| Server tests     | Vitest + Supertest              |
| Code quality     | ESLint                          |
| Package manager  | npm                             |

## Prerequisites

- [Node.js](https://nodejs.org/) 20.x or newer
- npm 10.x or newer
- Git

## Installation

```bash
git clone https://github.com/UN64DD/stock-tracker.git
cd stock-tracker
npm install
npm --prefix server install
```

Then configure the API server (see [Market data API (Phase 3)](#market-data-api-phase-3)):

```bash
cp server/.env.example server/.env
# edit server/.env and set STOCK_API_KEY to your Twelve Data key
```

## Local Development

Run the frontend and the API proxy together:

```bash
npm run dev:all
```

The Vite dev server starts on the URL it prints (default `http://localhost:5173`)
and proxies same-origin `/api/*` requests to the API server on
`http://localhost:3001`. You can also run them separately with `npm run dev` and
`npm run dev:server`.

## Build

```bash
npm run build
```

Production output is written to `dist/`. Preview it locally with:

```bash
npm run preview
```

### Running the API server in production

The proxy is a standard Node service. Build it once, then start it:

```bash
npm --prefix server run build   # compiles TypeScript to server/dist
npm --prefix server start       # node dist/index.js, listens on PORT (default 3001)
```

In production, place the built frontend (`dist/`) behind the same origin as the
API server (or set `VITE_API_BASE_URL` at build time to the server's public URL)
and set `CORS_ORIGIN` in `server/.env` to that origin. The API key is read only
from `server/.env` on the server host.

## Other Scripts

| Command                    | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `npm run dev:all`          | Run the web app and API proxy together             |
| `npm run dev:server`       | Run only the API proxy (`server/`, port 3001)      |
| `npm run lint`             | Run ESLint                                         |
| `npm run typecheck`        | Type-check the frontend without emitting files     |
| `npm run typecheck:server` | Type-check the API server                          |
| `npm run test:server`      | Run the API server test suite (Vitest + Supertest) |

## Market data API (Phase 3)

### Provider and why Twelve Data

The app uses the **Twelve Data** free Basic plan. Compared with alternatives
considered at the time:

- **Finnhub** free tier has no historical candles (`/stock/candle` is premium),
  which the price-history chart requires.
- **Alpha Vantage** free tier is limited to ~25 requests/day.
- **Twelve Data** offers **800 credits/day and 8 requests/minute**, real-time US
  equities/ETFs, `symbol_search` (1 credit), `quote` (1 credit), and
  `time_series` (1 credit) for intraday and daily candles.

Its one free-tier gap is the **company profile** endpoint (`/profile` requires a
paid Grow plan or higher), so the UI degrades gracefully: it falls back to quote
metadata and shows a notice instead of failing. Fundamentals such as P/E, EPS,
and dividend yield are therefore shown as `—`.

### Architecture: the key never reaches the browser

The provider API key is read **only** by the Express server (`server/`) and sent
to Twelve Data in the `Authorization` header. The React app never imports the key;
it calls same-origin `/api/*` routes which Vite proxies to the server in dev. A
`VITE_STOCK_API_KEY`-style variable is intentionally *not* used, because anything
prefixed with `VITE_` is embedded in the client bundle.

```
Browser ──/api/*──▶ Vite dev proxy ──▶ Express (holds STOCK_API_KEY) ──▶ Twelve Data
```

### Configuration (`server/.env`)

| Variable                       | Default                 | Purpose                                   |
| ------------------------------ | ----------------------- | ----------------------------------------- |
| `STOCK_API_KEY`                | — (required)            | Twelve Data API key                       |
| `STOCK_DATA_PROVIDER`          | `twelvedata`            | Provider implementation                   |
| `PORT`                         | `3001`                  | API server port                           |
| `PROVIDER_CREDITS_PER_MINUTE`  | `8`                     | Server-side upstream throttle             |
| `PROVIDER_CREDITS_PER_DAY`     | `800`                   | Server-side upstream daily budget         |
| `REQUEST_TIMEOUT_MS`           | `8000`                  | Upstream request timeout                  |
| `CORS_ORIGIN`                  | `http://localhost:5173` | Allowed browser origin                    |
| `CACHE_TTL_*_SECONDS`          | see file                | Per-data-type response cache TTL          |

### API endpoints

All `/api/stocks/*` responses use an envelope:
`{ data, meta: { provider, cached, stale, fetchedAt, dataStatus, dataStatusNote } }`.
Errors use `{ error: { code, message, details? } }`. (`/api/health` returns a
plain object, not the envelope.) Responses also include an `X-Data-Cache` header
of `hit`, `stale`, or `miss`.

| Method & path                          | Description                                      |
| -------------------------------------- | ------------------------------------------------ |
| `GET /api/health`                      | Liveness + provider configuration/status         |
| `GET /api/stocks/search?q=&limit=`     | Symbol/company search (max 20)                    |
| `GET /api/stocks/:symbol/quote`        | Latest quote for one symbol                       |
| `GET /api/stocks/quotes?symbols=A,B,C` | Batch quotes (max 8 symbols)                      |
| `GET /api/stocks/:symbol/history?range=` | Candles for `1D`/`1W`/`1M`/`3M`/`1Y` (cached)   |
| `GET /api/stocks/:symbol/profile`      | Company profile; degraded when plan-restricted    |

The server caches responses (quotes 60s, history/search 5m, profile 24h) and
serves stale cached data when the provider is temporarily unavailable. Provider
error text is never echoed to clients, so credentials cannot leak in error
bodies.

### Free-tier behavior you will notice

- The 8 requests/minute limit is tight. **Explore** loads live quotes for up to 6
  symbols per query and **global search** up to 5; results are cached and
  debounced. Occasional `429` responses are surfaced as a friendly retry message.
- Company fundamentals are hidden on the free plan (see above).

### Server scripts

Run these inside `server/` (or with `npm --prefix server run <script>`):

| Script        | Description                                    |
| ------------- | ---------------------------------------------- |
| `dev`         | Start the proxy with `tsx watch`               |
| `build`       | Compile TypeScript to `server/dist`            |
| `start`       | Run the compiled server (`node dist/index.js`) |
| `typecheck`   | Type-check the server without emitting         |
| `test`        | Run the Vitest suite once                      |
| `test:watch`  | Run Vitest in watch mode                       |

### Server tests

```bash
npm run test:server
```

Tests use an in-memory fake provider (no network, no API key) and cover search,
quotes, history, profile degradation, validation errors, and provider failure
mapping (auth → 502, rate limit → 429, timeout → 504), including asserting that
secrets never appear in responses.

## Features (Phase 1)

### Layout & navigation

- Dark charcoal **collapsible sidebar** (desktop) and off-canvas drawer (mobile).
- Sticky top **header** with global stock search, notifications, theme toggle, and a mock user profile dropdown.
- Reusable **page header** with contextual actions.
- Fully **responsive** across desktop, tablet, and mobile.

### Pages

| Route             | Page            | Highlights |
| ----------------- | --------------- | ---------- |
| `/`               | Dashboard       | Market summary cards (mock), **live watchlist quote preview**, interactive mock market chart, mock top gainers/losers, latest mock news. |
| `/stocks`         | Explore Stocks  | **Live symbol search** with debounced queries, sortable table, popular-symbol fallback, loading/error/empty states. |
| `/stocks/:symbol` | Stock Details   | **Live price, change, history chart with range selector**, live statistics, company overview (degraded on free tier), mock related news, watchlist toggle. |
| `/watchlist`      | Watchlist       | Search within saved symbols, remove with confirmation, price changes. |
| `/alerts`         | Price Alerts    | Create alerts (validated), enable/disable, delete with confirmation. |
| `/news`           | Market News     | Category and sentiment filters, search, article detail dialog. |
| `/settings`       | Settings        | Local profile, theme, notification preferences, reset demo data. |
| `/admin`          | Admin Dashboard | Mock stats, recent activity, stock metadata management, news entry management. |
| `*`               | Not Found       | Helpful 404 page. |

### Interactive behaviors

- **Live global and page-level stock search** backed by the provider (debounced).
- Working filters and multi-column sorting.
- Working chart time-range selection (**1D / 1W / 1M / 3M / 1Y**) that refetches live candles.
- Live watchlist quote preview on the dashboard.
- Watchlist add/remove with duplicate prevention.
- Alert create/toggle/delete with field validation.
- Toast notifications, empty states, loading states, error states.
- Confirmation dialogs before destructive actions.
- Consistent price/percentage formatting and accessible labels.

## Mock data

The following parts of the app are still driven by deterministic mock data (the
same values render on every reload). Live prices/search/history come from the API
proxy described above; everything else here is illustrative.

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

## Limitations

- No authentication or real user accounts.
- No database or server persistence (watchlist/alerts remain browser `localStorage`).
- Only search, quotes, price history, and (limited) profiles are live. Market
  indices, top movers, news, alerts, and admin data are still mock.
- Company fundamentals (P/E, EPS, dividend yield) require a paid Twelve Data plan
  and are shown as `—` on the free tier.
- Free-tier rate limits (8/min, 800/day) can produce occasional `429` responses.
- No background jobs; price alerts are never monitored and no emails are sent.
- News headlines, sources, and links are fictional; external article links are disabled placeholders.
- The admin dashboard is an openly accessible visual prototype with **no authorization**.
- Passwords are never requested or stored.

## Testing the interface

1. `npm install && npm --prefix server install`, set `STOCK_API_KEY` in
   `server/.env`, then run `npm run dev:all`.
2. Visit `/api/health` on the API server (or `http://localhost:5173/api/health`)
   and confirm `provider.configured` is `true`.
3. Visit `/` — verify market summary cards, chart range buttons change the mock
   chart, and the watchlist preview shows **live** quotes.
4. Go to `/stocks`, type `NVDA` in the search box, and try sorting by clicking
   table headers. Search for a nonsense string to see the empty state.
5. Open a live stock (e.g. `/stocks/AAPL`); switch chart ranges to refetch candles, then toggle **Add to watchlist** and visit `/watchlist` to confirm it appears.
6. On `/watchlist`, remove a symbol and confirm the dialog. Refresh the page — changes persist.
7. On `/alerts`, create an alert (try a negative target to see validation), toggle it, and delete it. Refresh — changes persist.
8. On `/news`, filter by category/sentiment and open an article detail dialog.
9. On `/settings`, switch the theme and change notification toggles, then refresh.
10. On `/admin`, add/remove stock metadata and create/edit a news entry.
11. Resize the browser to a mobile width and confirm the sidebar collapses into a drawer with no horizontal scrolling.

## Project Structure

```text
stock-tracker/
├── server/                 # Express market-data proxy (holds STOCK_API_KEY)
│   ├── src/
│   │   ├── lib/            # cache, budget, rate limit, validation, errors
│   │   ├── providers/      # TwelveDataProvider + provider interface
│   │   ├── routes/         # /api/health, /api/stocks/*
│   │   ├── services/       # MarketDataService (caching, degradation)
│   │   ├── app.ts          # Express app factory (test-injectable)
│   │   └── index.ts        # Server entry point
│   ├── .env.example
│   └── package.json
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── common/         # Reusable domain components (StatCard, StockChart, LiveBadge, …)
│   │   ├── layout/         # Sidebar, Header, PageHeader
│   │   └── ui/             # shadcn-style primitives
│   ├── config/             # Navigation config
│   ├── contexts/           # Watchlist, Alerts, Toast, Theme providers
│   ├── hooks/              # useLocalStorage, useAsync, useMarketData, useDebouncedValue
│   ├── layouts/            # DashboardLayout (route layout)
│   ├── lib/                # api client, cn, formatting, storage, stock selectors, liveStock
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
2. Authentication and database *(not implemented — skipped; the app remains a single-user localStorage prototype)*
3. Stock search and stock data API ✅ *(Twelve Data via server-side Express proxy)*
4. Interactive charts and company fundamentals *(charts are live; full fundamentals need a paid provider plan)*
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
