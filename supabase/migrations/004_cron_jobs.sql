-- Trovéa Cron Jobs
-- Generated: 2026-04-05

-- ─── PG_CRON SETUP ────────────────────────────────────────────────────────

-- Holds: expire every 15 minutes
SELECT cron.schedule(
  'expire-holds',
  '*/15 * * * *',
  $$
    UPDATE trovea.holds
    SET status = 'expired'
    WHERE status = 'active' AND expires_at < now();
  $$
);

-- Claims: expire every hour
SELECT cron.schedule(
  'expire-claims',
  '0 * * * *',
  $$
    UPDATE trovea.claims
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND expires_at < now();
  $$
);
