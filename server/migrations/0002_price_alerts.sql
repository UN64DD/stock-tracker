-- Phase 7: account-backed price alerts.
--
-- SQLite has no server-side Row Level Security, so per-user isolation follows
-- the same approach as watchlists: every query in the service layer is scoped
-- by user_id, and the routes derive that id from the authenticated session.
-- These constraints back that up so invalid rows cannot be written.
--
-- A row is considered:
--   * disabled  when enabled = 0
--   * triggered when triggered_at IS NOT NULL
--   * active    otherwise (enabled = 1, not yet triggered)

CREATE TABLE price_alerts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- RESTRICT keeps the shared stock catalogue row when an alert is removed.
  symbol          TEXT NOT NULL REFERENCES stocks (symbol) ON DELETE RESTRICT,
  condition       TEXT NOT NULL CHECK (
                    condition IN (
                      'price_above',
                      'price_below',
                      'percent_increase',
                      'percent_decrease'
                    )
                  ),
  -- A positive price or a positive percentage, depending on the condition.
  threshold       REAL NOT NULL CHECK (threshold > 0),
  enabled         INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  triggered_at    TEXT,
  last_checked_at TEXT,
  last_price      REAL,
  -- Reference price for percentage conditions (session open of the 1-day
  -- window); NULL for absolute price conditions.
  baseline_price  REAL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE INDEX idx_price_alerts_user_id ON price_alerts (user_id);
CREATE INDEX idx_price_alerts_symbol ON price_alerts (symbol);
CREATE INDEX idx_price_alerts_user_status
  ON price_alerts (user_id, enabled, triggered_at);
