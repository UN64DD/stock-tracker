-- Phase 8: email notifications for triggered price alerts.
--
-- One row is written the moment an alert transitions from active to triggered,
-- *before* the provider send is attempted, so a crash mid-send can never
-- produce a second email for the same trigger (the unique index below is the
-- idempotency guard). The row records delivery state only — never credentials,
-- API keys, or message bodies.
--
-- `alert_id` is nullable with ON DELETE SET NULL so notification history
-- survives deleting the alert that produced it; the trigger details are
-- snapshotted into their own columns for the same reason.

CREATE TABLE alert_notifications (
  id                TEXT PRIMARY KEY,
  alert_id          TEXT REFERENCES price_alerts (id) ON DELETE SET NULL,
  user_id           TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  recipient_email   TEXT NOT NULL,
  symbol            TEXT NOT NULL,
  company_name      TEXT,
  condition         TEXT NOT NULL,
  threshold         REAL NOT NULL,
  trigger_price     REAL,
  change_percent    REAL,
  triggered_at      TEXT NOT NULL,
  -- pending: row written, send not yet attempted/finished
  -- accepted: provider accepted the send (not a delivery guarantee)
  -- delivered: webhook confirmed inbox delivery
  -- failed: send attempt failed (error_code/error_message explain why)
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'delivered', 'failed')),
  provider_message_id TEXT,
  error_code        TEXT,
  error_message     TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  last_attempt_at   TEXT,
  accepted_at       TEXT,
  delivered_at      TEXT
);

-- Idempotency: at most one notification per alert trigger. Re-arming an alert
-- produces a new triggered_at, which is allowed to notify again.
CREATE UNIQUE INDEX idx_alert_notifications_trigger
  ON alert_notifications (alert_id, triggered_at);

CREATE INDEX idx_alert_notifications_user
  ON alert_notifications (user_id, created_at DESC);

-- Per-user switch for price-alert emails. 1 (default) = send when an alert
-- triggers; 0 = skip entirely (no email, no history row).
ALTER TABLE users ADD COLUMN notify_price_alert_emails INTEGER NOT NULL DEFAULT 1;
