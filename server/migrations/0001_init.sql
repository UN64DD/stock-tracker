-- Phase 5: persistent watchlists.
--
-- SQLite has no server-side Row Level Security, so per-user isolation is
-- enforced in the service layer: every watchlist query is scoped by user_id.
-- These constraints back that up and prevent duplicate records.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- A lightweight catalogue of stocks referenced by watchlists. Rows are created
-- on demand from the metadata the client already has (search/quote results) so
-- the server never has to make an extra provider call just to save a symbol.
CREATE TABLE stocks (
  symbol     TEXT PRIMARY KEY,
  name       TEXT,
  currency   TEXT,
  exchange   TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE watchlists (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'My Watchlist',
  created_at TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE watchlist_items (
  id           TEXT PRIMARY KEY,
  watchlist_id TEXT NOT NULL REFERENCES watchlists (id) ON DELETE CASCADE,
  -- RESTRICT keeps the stock catalogue row when a watchlist item is removed.
  symbol       TEXT NOT NULL REFERENCES stocks (symbol) ON DELETE RESTRICT,
  created_at   TEXT NOT NULL,
  UNIQUE (watchlist_id, symbol)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items (watchlist_id);
CREATE INDEX idx_watchlist_items_symbol ON watchlist_items (symbol);
