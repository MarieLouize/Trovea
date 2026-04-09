-- 1. RPC to get open windows
CREATE OR REPLACE FUNCTION trovea.get_open_windows_for_merchant(p_merchant_id UUID)
RETURNS SETOF trovea.availability_windows LANGUAGE sql SECURITY DEFINER SET search_path = trovea AS $$
  SELECT * FROM trovea.availability_windows
  WHERE merchant_id = p_merchant_id
    AND status = 'open'
    AND opens_at <= now()
    AND closes_at > now();
$$;

GRANT EXECUTE ON FUNCTION trovea.get_open_windows_for_merchant(UUID) TO anon, authenticated;

-- 2. Cron: Update window status (upcoming -> open -> closed)
SELECT cron.schedule(
  'update-window-status',
  '*/5 * * * *',
  $$
    -- Transition upcoming to open
    UPDATE trovea.availability_windows
    SET status = 'open'
    WHERE status = 'upcoming' AND opens_at <= now() AND closes_at > now();

    -- Transition open to closed
    UPDATE trovea.availability_windows
    SET status = 'closed'
    WHERE status = 'open' AND closes_at <= now();
  $$
);

-- 3. Cron: Update drop status (scheduled -> live)
SELECT cron.schedule(
  'update-drop-status',
  '*/5 * * * *',
  $$
    UPDATE trovea.drops
    SET status = 'live'
    WHERE status = 'scheduled' AND scheduled_at <= now();
  $$
);
