-- Migration: 011_cron_expirations
-- Implements robust expiration logic that restores product stock

-- 1. Expiration Logic Function
CREATE OR REPLACE FUNCTION trovea.release_expired_holds_and_claims()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
DECLARE
  v_hold RECORD;
  v_claim RECORD;
BEGIN
  -- A. Handle Expired Holds
  FOR v_hold IN 
    UPDATE trovea.holds
    SET status = 'expired', updated_at = now()
    WHERE status = 'active' AND expires_at < now()
    RETURNING product_id
  LOOP
    UPDATE trovea.products
    SET stock_level = stock_level + 1, updated_at = now()
    WHERE id = v_hold.product_id;
  END LOOP;

  -- B. Handle Expired Claims
  FOR v_claim IN 
    UPDATE trovea.claims
    SET status = 'expired', updated_at = now()
    WHERE status = 'pending' AND expires_at < now()
    RETURNING product_id
  LOOP
    UPDATE trovea.products
    SET stock_level = stock_level + 1, updated_at = now()
    WHERE id = v_claim.product_id;
  END LOOP;
END;
$$;

-- 2. Update pg_cron scheduling (unschedule old, schedule new)
-- Note: Replace with actual cron names from 004_cron_jobs.sql if they differ
SELECT cron.unschedule('expire-holds');
SELECT cron.unschedule('expire-claims');

SELECT cron.schedule(
  'trovea-batch-expiration',
  '* * * * *', -- Run every minute for high responsiveness
  'SELECT trovea.release_expired_holds_and_claims();'
);
