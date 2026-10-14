# Stock Tracker

A modern stock market dashboard with interactive charts, persistent watchlists, price alerts, company news, and market insights.

> **Status:** Phase 5 — persistent watchlists. Stock **search, quotes, price history (1D–5Y), company profiles, and a financial overview** are fetched live from [Twelve Data](https://twelvedata.com/) through a small Express server that keeps the API key out of the browser. Watchlists are now **stored per account** in a SQLite database behind a minimal session-based auth system, so they survive reloads and follow you across browsers/devices. Reported fundamentals (P/E, EPS, dividend yield, revenue) require a paid plan and degrade to a clear unavailable state on the free tier. Market indices, news, alerts, and admin data remain deterministic **mock data**, and price alerts are still browser-`localStorage` only (no background jobs). See [Persistent watchlists (Phase 5)](#persistent-watchlists-phase-5) and [Market data API (Phase 3–4)](#market-data-api-phase-34).

## Overview

Stock Tracker is a portfolio-quality application built incrementally. Phase 0 established the project foundation; Phase 1 delivered a complete, responsive dashboard UI; Phase 3 wired a real market data provider in through a server-side proxy; Phase 4 added an interactive price chart (1D–5Y, line/area, period statistics) and a company financial overview; Phase 5 adds **persistent, per-user watchlists** with a small SQLite-backed account/session system. The architecture is feature-oriented and keeps remaining mock data isolated so it can be replaced cleanly later.

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
| Database         | SQLite via `better-sqlite3`     |
| Auth             | Cookie sessions + scrypt hashing |
| Market data      | Twelve Data (free Basic tier)   |
| Server tests     | Vitest + Supertest              |
| Code quality     | ESLint                          |
| Package manager  | npm                             |

## Prerequisites

- [Node.js](https://nodejs.org/) 20.x or newer
- npm 10.x or newer
- Git
- (Optional) a C toolchain, only if `better-sqlite3` has no prebuilt binary for
  your platform and falls back to compiling from source

## Installation

```bash
git clone https://github.com/UN64DD/stock-tracker.git
cd stock-tracker
npm install
npm --prefix server install
```

Then configure the API server (see [Market data API](#market-data-api-phase-34)):

```bash
cp server/.env.example server/.env
# edit server/.env and set STOCK_API_KEY to your Twelve Data key
```

The SQLite database file is created automatically the first time the server
starts, and schema migrations run on boot (see
[Persistent watchlists](#persistent-watchlists-phase-5)). No manual database setup
is required.

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
from `server/.env` on the server host. Serve over HTTPS and set
`COOKIE_SECURE=true` so the session cookie is only sent over TLS. Persist
`DATABASE_PATH` (or its directory) on a durable volume — it holds all accounts
and watchlists.

## Other Scripts

| Command                    | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `npm run dev:all`          | Run the web app and API proxy together             |
| `npm run dev:server`       | Run only the API proxy (`server/`, port 3001)      |
| `npm run lint`             | Run ESLint                                         |
| `npm run typecheck`        | Type-check the frontend without emitting files     |
| `npm run typecheck:server` | Type-check the API server                          |
| `npm run test:web`         | Run the frontend unit tests (Vitest)               |
| `npm run test:web:watch`   | Run the frontend unit tests in watch mode          |
| `npm run test:server`      | Run the API server test suite (Vitest + Supertest) |
| `npm run test:all`         | Run the frontend and server test suites together   |

## Persistent watchlists (Phase 5)

Watchlists are stored on the server, per account, in SQLite. This required adding
a minimal authentication layer, because a watchlist is only useful if it belongs
to a specific user.

### Accounts and sessions

- **Passwords** are hashed with Node's `crypto.scrypt` using a per-user random
  salt and a timing-safe comparison. Plaintext passwords are never stored.
- On register/login the server issues a **session token** (32 random bytes,
  base64url). Only a SHA-256 **hash** of the token is written to the `sessions`
  table, so a database leak does not expose usable tokens.
- The token is sent to the browser as an **HttpOnly**, `SameSite=Lax` cookie
  (`st_session`, 7-day default TTL). The frontend never reads it; requests use
  `credentials: 'include'` and the Vite dev proxy keeps `/api/*` same-origin.
- `POST /api/auth/logout` deletes the session row and clears the cookie. Expired
  sessions are pruned when they are encountered.

Set `COOKIE_SECURE=true` and serve over HTTPS in production. CORS is configured
with `credentials: true` for the single allowed origin in `CORS_ORIGIN`.

### Per-user isolation

SQLite has no row-level security, so isolation is enforced in the **service
layer**: every watchlist query is scoped by `user_id`, and the routes derive that
id from the authenticated session — never from a client-supplied value. The
database schema backs this up with constraints so bad states cannot be written:

| Table             | Constraint                                                        | Purpose |
| ----------------- | ----------------------------------------------------------------- | ------- |
| `users`           | `UNIQUE(email)`                                                   | One account per email |
| `sessions`        | `token_hash` primary key, `ON DELETE CASCADE` from `users`        | Sessions die with the user |
| `stocks`          | `symbol` primary key                                              | Shared symbol catalogue |
| `watchlists`      | `UNIQUE(user_id, name)`, `ON DELETE CASCADE` from `users`         | One list per user (a default list today) |
| `watchlist_items` | `UNIQUE(watchlist_id, symbol)`, `ON DELETE CASCADE` from `watchlists` | No duplicate symbols in a list |

`watchlist_items.symbol` references `stocks(symbol)` with `ON DELETE RESTRICT`,
so removing a watchlist item deletes only the join row and keeps the shared
stock metadata.

### Schema and migrations

| Table             | Key columns |
| ----------------- | ----------- |
| `users`           | `id`, `email`, `display_name`, `password_hash`, `password_salt`, `created_at` |
| `sessions`        | `token_hash`, `user_id`, `created_at`, `expires_at` |
| `stocks`          | `symbol`, `name`, `currency`, `exchange`, `updated_at` |
| `watchlists`      | `id`, `user_id`, `name`, `created_at` |
| `watchlist_items` | `id`, `watchlist_id`, `symbol`, `added_at` |

Migration files live in `server/migrations/` and are applied **automatically on
server start**. Applied files are recorded in a `schema_migrations` table, and
each file runs inside a transaction, so migrations are idempotent across
restarts. The database is opened with `journal_mode=WAL` and
`foreign_keys=ON`. The file path comes from `DATABASE_PATH` and defaults to
`server/data/stock-tracker.sqlite` (git-ignored).

### How the frontend uses it

`WatchlistProvider` is the single source of truth. It loads `GET /api/watchlist`
after the session resolves and refetches after each add/remove, so the dashboard
preview, stock details page, and watchlist page always agree. Adding a symbol
sends its known name/currency/exchange as a hint; the server upserts the stock
catalogue row. Quotes for the saved symbols are fetched through the existing
batched `/api/stocks/quotes` endpoint. `localStorage` is **not** used for the
watchlist anymore.

### Trying it

1. Run `npm run dev:all`, open the app, and click **Sign in** → **Create account**.
2. Add a few symbols, then **refresh**: they persist because they came from the server.
3. Sign out and back in — the watchlist returns. Sign in from another browser and it is there too.
4. Register a **second account** to confirm each user sees only their own symbols.
5. Restart the API server — data is still present in the SQLite file. Delete that
   file to start over.

## Market data API (Phase 3–4)

### Provider and why Twelve Data

The app uses the **Twelve Data** free Basic plan. Compared with alternatives
considered at the time:

- **Finnhub** free tier has no historical candles (`/stock/candle` is premium),
  which the price-history chart requires.
- **Alpha Vantage** free tier is limited to ~25 requests/day.
- **Twelve Data** offers **800 credits/day and 8 requests/minute**, real-time US
  equities/ETFs, `symbol_search` (1 credit), `quote` (1 credit), and
  `time_series` (1 credit) for intraday and daily candles.

Its free-tier gaps are the **company profile** endpoint (`/profile`, Grow plan
or higher) and the **statistics** endpoint (`/statistics`, Pro plan or higher),
which is the source of reported fundamentals. The UI degrades gracefully: the
profile falls back to quote metadata, and the financial overview falls back to
live quote metrics while reported figures (market cap, P/E, EPS, dividend yield,
revenue) are shown as `—` with a notice explaining the plan requirement. The
server remembers a plan-restricted response for six hours so it does not retry a
paid endpoint on every request.

### Architecture: the key never reaches the browser

The provider API key is read **only** by the Express server (`server/`) and sent
to Twelve Data in the `Authorization` header. The React app never imports the key;
it calls same-origin `/api/*` routes which Vite proxies to the server in dev. A
`VITE_STOCK_API_KEY`-style variable is intentionally *not* used, because anything
prefixed with `VITE_` is embedded in the client bundle.

```
Browser ──/api/*──▶ Vite dev proxy ──▶ Express ──▶ Twelve Data   (market data)
                                        │        └──▶ SQLite       (accounts + watchlists)
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
| `CACHE_TTL_*_SECONDS`          | see file                | Per-data-type response cache TTL (`CACHE_TTL_FINANCIALS_SECONDS` caches the financial overview) |
| `DATABASE_PATH`                | `./data/stock-tracker.sqlite` | SQLite file for accounts and watchlists |
| `SESSION_TTL_SECONDS`          | `604800` (7 days)       | Session lifetime                          |
| `AUTH_COOKIE_NAME`             | `st_session`            | Name of the session cookie                |
| `COOKIE_SECURE`                | `false`                 | Set `true` when serving over HTTPS in production |

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
| `GET /api/stocks/:symbol/history?range=` | Candles for `1D`/`1W`/`1M`/`3M`/`6M`/`1Y`/`5Y` (cached) |
| `GET /api/stocks/:symbol/profile`      | Company profile; degraded when plan-restricted    |
| `GET /api/stocks/:symbol/financials`   | Financial overview: live metrics + reported fundamentals; degraded when plan-restricted |
| `POST /api/auth/register`             | Create an account and start a session             |
| `POST /api/auth/login`                | Sign in and start a session                       |
| `POST /api/auth/logout`               | End the current session                           |
| `GET /api/auth/me`                    | Current user (401 when signed out)                |
| `GET /api/watchlist`                  | The signed-in user's saved watchlist              |
| `POST /api/watchlist/items`           | Add a symbol (idempotent per user)                |
| `DELETE /api/watchlist/items/:symbol` | Remove a symbol from the user's watchlist         |

The server caches responses (quotes 60s, history/search 5m, profile/financials
24h) and serves stale cached data when the provider is temporarily unavailable.
Provider error text is never echoed to clients, so credentials cannot leak in
error bodies.

The auth/watchlist routes are **not** market-data envelopes: `GET /api/watchlist`
returns `{ data: { items, count } }`, and `POST /api/watchlist/items` returns
`{ data: { item, created } }` where `created` is `false` when the symbol was
already saved. Errors use the same `{ error: { code, message } }` shape. The
`/api/auth/*` routes are additionally rate-limited (30 requests/minute).

#### Chart range → provider interval mapping

The `range` query parameter selects a Twelve Data interval and observation
count. All listed ranges are supported by the free tier. Intraday ranges use
UTC-normalized minute/hour bars; longer ranges use daily/weekly closes.

| Range | Interval | Observations | Data status |
| ----- | -------- | ------------ | ----------- |
| `1D`  | `5min`   | 78 (~1 session) | real-time |
| `1W`  | `30min`  | 65 | real-time |
| `1M`  | `1day`   | 30 | end-of-day |
| `3M`  | `1day`   | 92 | end-of-day |
| `6M`  | `1day`   | 183 | end-of-day |
| `1Y`  | `1day`   | 366 | end-of-day |
| `5Y`  | `1week`  | 261 | end-of-day |

Unsupported values are rejected with `400 validation_error` rather than
silently substituting a different window.

#### `GET /api/stocks/:symbol/financials`

Returns the stock-details financial overview, normalizing live market data with
reported fundamentals. Response `data` shape:

```ts
{
  symbol: string
  name: string | null
  currency: string | null
  exchange: string | null
  // Live market metrics (from /quote)
  high52Week: number | null
  low52Week: number | null
  averageVolume: number | null
  // Reported fundamentals (from /statistics; null when unavailable)
  marketCap: number | null
  trailingPe: number | null
  eps: number | null
  dividendYieldPercent: number | null   // e.g. 0.57 means 0.57%
  revenue: number | null
  revenuePeriod: string | null          // e.g. "TTM"
  dataStatus: 'real-time' | 'delayed' | 'end-of-day' | 'unknown'
  limited: boolean                      // true when reported fundamentals are withheld by the plan
  limitationReason: string | null
}
```

`null` always means "not available" — the UI never substitutes zero. On the free
plan `limited` is `true` and the reported fundamentals are `null`; the live
metrics remain populated.

### Free-tier behavior you will notice

- The 8 requests/minute limit is tight. **Explore** loads live quotes for up to 6
  symbols per query and **global search** up to 5; results are cached and
  debounced. Occasional `429` responses are surfaced as a friendly retry message.
- Company fundamentals are hidden on the free plan (see above). On a stock
  details page the chart, price, 52-week range, and average volume are live; the
  reported fundamentals panel explains why P/E, EPS, dividend yield, market cap,
  and revenue are `—`.

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

Tests use an in-memory fake provider (no network, no API key) and an in-memory
SQLite database, and cover search, quotes, every supported history range, empty
historical datasets, range-switch caching, profile degradation,
financial-overview degradation, validation errors, and provider failure mapping
(auth → 502, rate limit → 429, timeout → 504), including asserting that secrets
never appear in responses. They also cover the Phase 5 auth and watchlist flows:
registration/login, session cookie issuance, sign-out, `401` guards, per-user
isolation (one user never sees another's items), duplicate-add idempotency, and
removal. Provider-level tests stub the global `fetch` to verify Twelve Data
response normalization (sorting/de-duplication, dropping invalid observations,
the `statistics` mapping, and plan-restricted 403 handling) without any network
access.

### Frontend tests

```bash
npm run test:web
```

Deterministic Vitest unit tests for the pure helpers:
`normalizeHistoryPoints` (invalid/missing/out-of-order/duplicate data),
`computePeriodStats` (open/close/high/low and percentage change, empty datasets,
divide-by-zero), range classification, timestamp formatting, currency-aware
price/percentage/compact formatting, and the watchlist join/sort helpers
(`mergeWatchlist` keeping quote-less items, sort order including
missing-quotes-last and tie-breaking, and freshness formatting). Component
rendering and responsive layout have no automated coverage in this project and
are verified manually (see [Testing the interface](#testing-the-interface)).

## Features (Phase 1)

### Layout & navigation

- Dark charcoal **collapsible sidebar** (desktop) and off-canvas drawer (mobile).
- Sticky top **header** with global stock search, notifications, theme toggle, and an account menu (sign in/out).
- Reusable **page header** with contextual actions.
- Fully **responsive** across desktop, tablet, and mobile.

### Pages

| Route             | Page            | Highlights |
| ----------------- | --------------- | ---------- |
| `/`               | Dashboard       | Market summary cards (mock), **live watchlist quote preview** (sign-in prompt when signed out), interactive mock market chart, mock top gainers/losers, latest mock news. |
| `/stocks`         | Explore Stocks  | **Live symbol search** with debounced queries, sortable table, popular-symbol fallback, loading/error/empty states. |
| `/stocks/:symbol` | Stock Details   | **Live price, change, interactive history chart (1D–5Y, line/area, period statistics and tooltips)**, financial overview (live vs reported, degraded on free tier), company summary, mock related news, watchlist toggle. |
| `/watchlist`      | Watchlist       | **Account-backed** saved symbols (requires sign-in): live quotes, gainers/losers summary, sortable columns, in-list search, remove with confirmation, missing-quote handling. |
| `/login`          | Sign in / Up    | Register or sign in; redirects back to the page you came from. |
| `/alerts`         | Price Alerts    | Create alerts (validated), enable/disable, delete with confirmation. |
| `/news`           | Market News     | Category and sentiment filters, search, article detail dialog. |
| `/settings`       | Settings        | Local profile, theme, notification preferences, reset demo data. |
| `/admin`          | Admin Dashboard | Mock stats, recent activity, stock metadata management, news entry management. |
| `*`               | Not Found       | Helpful 404 page. |

### Interactive behaviors

- **Live global and page-level stock search** backed by the provider (debounced).
- Working filters and multi-column sorting.
- Working chart time-range selection (**1D / 1W / 1M / 3M / 6M / 1Y / 5Y**) that refetches live candles, plus line/area display options.
- Selected-period statistics (open, close, high, low, percentage change) computed from the returned observations and clearly separated from the daily price change.
- Live watchlist quote preview on the dashboard (and a sign-in prompt when signed out).
- **Account-backed watchlist** add/remove with duplicate prevention and per-user isolation.
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
- `history.ts` — a seeded (mulberry32) historical-series generator plus `DEMO_NOW`, so the dashboard's mock chart is stable and reproducible per symbol/range. The canonical chart range list and the live-chart math live in `src/lib/chart.ts`.
- `news.ts` — fictional, clearly labelled news articles.
- `alerts.ts` — example demo alerts and condition labels.
- `admin.ts` — mock admin activity, demo profile, and notifications.

Shared TypeScript types live in `src/types/index.ts`. Nothing in `src/mocks/` imports from components, so mock modules can be swapped for real API calls later.

## localStorage (remaining frontend-only state)

The watchlist is now stored server-side (see
[Persistent watchlists](#persistent-watchlists-phase-5)). The following demo
state is still persisted in your browser via `localStorage` and is **not**
multi-user — clearing site data or using another browser resets it:

| Data                         | Storage key                     |
| ---------------------------- | ------------------------------- |
| Price alerts                 | `stock-tracker:alerts`          |
| Theme preference             | `stock-tracker:theme`           |
| Notification preferences     | `stock-tracker:preferences`     |
| Admin-managed stock metadata | `stock-tracker:admin-stocks`    |
| Admin-managed news entries   | `stock-tracker:admin-news`      |
| Local settings profile       | `stock-tracker:profile`         |

A legacy `stock-tracker:watchlist` key may still exist in browsers from earlier
phases; it is no longer read and is cleared by **Settings → Demo data → Reset
demo data**, which does not affect your server-saved watchlist.

## Limitations

- Watchlists are persisted per account in a single-node SQLite file (not a
  managed, replicated database), and isolation is enforced in the service layer
  rather than by database row-level security.
- Auth is intentionally minimal: email + password only, no email verification,
  password reset, account deletion, or OAuth. Sessions are long-lived cookies
  (7 days) and there is no cross-device session management UI.
- Price alerts remain browser `localStorage` and are not tied to an account.
- Only search, quotes, price history, and (limited) profiles are live. Market
  indices, top movers, news, alerts, and admin data are still mock.
- Reported company fundamentals (market cap, P/E, EPS, dividend yield, revenue)
  require a paid Twelve Data plan (`/statistics` is Pro+, `/profile` is Grow+)
  and are shown as `—` with an explanation on the free tier. The server does not
  bypass these restrictions; it attempts the endpoint at most once every six
  hours and falls back to live quote metrics.
- Historical ranges are limited to `1D`–`5Y` (the provider supports no free
  intraday depth beyond a session, and no paid-only intervals are used).
- Free-tier rate limits (8/min, 800/day) can produce occasional `429` responses.
- No background jobs; price alerts are never monitored and no emails are sent.
- News headlines, sources, and links are fictional; external article links are disabled placeholders.
- The admin dashboard is an openly accessible visual prototype with **no authorization**.
- Passwords are stored only as salted `scrypt` hashes; they are never stored or
  logged in plaintext, and session tokens are persisted only as SHA-256 hashes.

## Testing the interface

1. `npm install && npm --prefix server install`, set `STOCK_API_KEY` in
   `server/.env`, then run `npm run dev:all`.
2. Visit `/api/health` on the API server (or `http://localhost:5173/api/health`)
   and confirm `provider.configured` is `true`.
3. Visit `/` — verify market summary cards, chart range buttons change the mock
   chart, and the watchlist preview prompts you to sign in.
4. Click **Sign in** → **Create account**, register a test account, and confirm
   the header now shows your initials.
5. Go to `/stocks`, type `NVDA` in the search box, and try sorting by clicking
   table headers. Search for a nonsense string to see the empty state.
6. Open a live stock (e.g. `/stocks/AAPL`). Switch between **1D**, **1W**,
   **1M**, **3M**, **6M**, **1Y**, and **5Y** and confirm the chart refetches,
   the period open/close/high/low and percentage change update, and the tooltip
   shows the observation timestamp and price. Toggle **area/line**, then click
   **Add to watchlist** and visit `/watchlist` to confirm it appears.
7. On the same page, review the **Company summary** and **Financials** sections.
   On the free tier, reported fundamentals show `—` with a plan notice while the
   live 52-week range and average volume render normally.
8. Rapidly switch between two symbols (e.g. `AAPL` then `MSFT`) and confirm that
   a slow response for the first never overwrites the second.
9. On `/watchlist`, sort by price/change (symbols with no quote sort last), search
   within the list, then remove a symbol and confirm the dialog. Refresh the page —
   changes persist because they were saved on the server.
10. Sign out and sign back in: your watchlist returns. Register a **second account**
    to confirm it starts empty (per-user isolation).
11. On a signed-out browser, visiting `/watchlist` redirects to `/login`.
12. On `/alerts`, create an alert (try a negative target to see validation), toggle it, and delete it. Refresh — changes persist.
13. On `/news`, filter by category/sentiment and open an article detail dialog.
14. On `/settings`, switch the theme and change notification toggles, then refresh.
15. On `/admin`, add/remove stock metadata and create/edit a news entry.
16. Resize the browser to a mobile width and confirm the sidebar collapses into a drawer with no horizontal scrolling.

For automated coverage run `npm run test:all` (frontend helpers + API server).
A real-provider smoke test is optional: with a valid `STOCK_API_KEY`, open a
live symbol and confirm `/api/stocks/:symbol/history?range=5Y` and
`/api/stocks/:symbol/financials` return `200`. Keep requests minimal to preserve
the free-tier daily quota.

## Project Structure

```text
stock-tracker/
├── server/                 # Express API (holds STOCK_API_KEY + SQLite DB)
│   ├── migrations/         # SQL schema migrations (applied on boot)
│   ├── src/
│   │   ├── db/             # SQLite open + migration runner
│   │   ├── lib/            # cache, budget, rate limit, validation, cookies, errors
│   │   ├── middleware/     # session/auth middleware (requireAuth)
│   │   ├── providers/      # TwelveDataProvider + provider interface
│   │   ├── routes/         # /api/health, /api/stocks/*, /api/auth/*, /api/watchlist
│   │   ├── services/       # MarketDataService, AuthService, WatchlistService
│   │   ├── testing/        # in-memory app/db fakes for tests
│   │   ├── types/          # Express request augmentation
│   │   ├── app.ts          # Express app factory (test-injectable)
│   │   └── index.ts        # Server entry point
│   ├── data/               # SQLite file (git-ignored, created at runtime)
│   ├── .env.example
│   └── package.json
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── common/         # Reusable domain components (StatCard, StockChart, WatchlistTable, …)
│   │   ├── layout/         # Sidebar, Header, PageHeader
│   │   └── ui/             # shadcn-style primitives
│   ├── config/             # Navigation config
│   ├── contexts/           # Auth, Watchlist, Alerts, Toast, Theme providers
│   ├── hooks/              # useLocalStorage, useAsync, useMarketData, useDebouncedValue
│   ├── layouts/            # DashboardLayout (route layout)
│   ├── lib/                # api client, cn, formatting, chart math, watchlist join/sort, storage, liveStock
│   ├── mocks/              # Deterministic mock data
│   ├── pages/              # Route pages (incl. LoginPage, WatchlistPage)
│   ├── types/              # Shared TypeScript types
│   ├── App.tsx             # Router + providers
│   └── main.tsx
├── tests/                  # Frontend Vitest unit tests (pure helpers)
├── components.json         # shadcn/ui configuration
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── vitest.config.ts        # Frontend test runner configuration
└── vite.config.ts
```

The `@/*` import alias points at `src/`.

## Planned Development Phases

1. Project foundation and UI ✅
2. Authentication and database *(skipped as its own phase; minimal session auth + SQLite were added during Phase 5 to support per-user watchlists)*
3. Stock search and stock data API ✅ *(Twelve Data via server-side Express proxy)*
4. Interactive charts and company fundamentals ✅ *(live 1D–5Y line/area charts; reported fundamentals degrade to a clear unavailable state on the free provider plan)*
5. Persistent watchlists ✅ *(per-account SQLite storage behind session-cookie auth)*
6. News and market sentiment
7. Price alerts
8. Email notifications
9. Background workflows
10. Admin dashboard
11. UI polish
12. Testing and deployment

## License

Not yet specified.
