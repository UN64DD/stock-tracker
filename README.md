# Stock Tracker

A modern stock market dashboard with interactive charts, watchlists, price alerts, company news, and market insights.

> **Status:** Phase 0 — project foundation only. The application runs with mock data once Phase 1 lands. No backend, database, authentication, or live stock APIs are wired up yet.

## Overview

Stock Tracker is a portfolio-quality frontend application built incrementally. The architecture is feature-oriented and intentionally prepared for a future backend and external API integration without implementing them prematurely.

## Technology Stack

| Concern          | Choice                          |
| ---------------- | ------------------------------- |
| Frontend         | React 19 + TypeScript           |
| Build tool       | Vite                            |
| Styling          | Tailwind CSS v4                 |
| UI components    | shadcn/ui (configured)          |
| Icons            | Lucide React                    |
| Charts           | Recharts                        |
| Routing          | React Router                    |
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
```

Optionally, copy the environment template and fill in values when integrations are added:

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

## Project Structure

```text
stock-tracker/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Bundled assets
│   ├── components/
│   │   ├── layout/         # Layout-level components
│   │   └── ui/             # shadcn/ui primitives
│   ├── features/           # Feature modules
│   │   ├── dashboard/
│   │   ├── stocks/
│   │   ├── watchlist/
│   │   ├── alerts/
│   │   └── news/
│   ├── layouts/            # Route layouts
│   ├── lib/                # Shared utilities (e.g. cn)
│   ├── mocks/              # Mock data for local development
│   ├── pages/              # Route pages
│   ├── types/              # Shared TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── .env.example
├── .gitignore
├── components.json         # shadcn/ui configuration
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

The `@/*` import alias points at `src/`.

## GitHub Repository Setup

The repo name is `stock-tracker`.

If GitHub CLI is available and authenticated:

```bash
gh auth status
gh repo create stock-tracker --public --source=. --remote=origin --description "A modern stock market dashboard with interactive charts, watchlists, price alerts, company news, and market insights."
git push -u origin main
```

Manual setup (no GitHub CLI):

1. Create the repository `stock-tracker` on GitHub at <https://github.com/new>.
2. Connect it as the remote and push:

```bash
git remote add origin https://github.com/UN64DD/stock-tracker.git
git branch -M main
git push -u origin main
```

## Planned Development Phases

1. Project foundation and UI
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
