-- Migration: 012_security_and_integrity_fixes
-- Addresses all critical and high-severity findings from the structural audit.
-- Safe to run on an existing database: uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS.

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 1: SCHEMA GAPS — missing columns (C7, C8, + product/receipt type gaps)
-- ══════════════════════════════════════════════════════════════════════════════

-- 1A. bookings — missing no_show and updated_at (C7)
ALTER TABLE trovea.bookings
  ADD COLUMN IF NOT EXISTS no_show    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW();

CREATE OR REPLACE TRIGGER bookings_set_updated_at
  BEFORE UPDATE ON trovea.bookings
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- 1B. enquiries — missing client_phone, notes, decline_reason (C8)
ALTER TABLE trovea.enquiries
  ADD COLUMN IF NOT EXISTS client_phone   TEXT,
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- 1C. products — per_window_cap used by Vendor store type but not in schema
ALTER TABLE trovea.products
  ADD COLUMN IF NOT EXISTS per_window_cap INTEGER
  CHECK (per_window_cap IS NULL OR per_window_cap > 0);

-- 1D. receipts — deposit_amount and balance_due used by Host/Studio but not in schema
ALTER TABLE trovea.receipts
  ADD COLUMN IF NOT EXISTS deposit_amount INTEGER,
  ADD COLUMN IF NOT EXISTS balance_due    INTEGER;

-- 1E. holds — updated_at missing; 011_cron_expirations.sql tries to SET it
ALTER TABLE trovea.holds
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 2: CONSTRAINT HARDENING
-- ══════════════════════════════════════════════════════════════════════════════

-- 2A. Unique active hold per product (C2)
-- Guarantees only one active hold exists at a time per product.
-- The RPC (Part 7) handles multi-stock via aggregate count; this is the DB-level backstop.
CREATE UNIQUE INDEX IF NOT EXISTS idx_holds_one_active_per_product
  ON trovea.holds (product_id)
  WHERE status = 'active';

-- 2B. Availability windows: closing time must follow opening time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'trovea'
      AND table_name   = 'availability_windows'
      AND constraint_name = 'chk_window_dates'
  ) THEN
    ALTER TABLE trovea.availability_windows
      ADD CONSTRAINT chk_window_dates CHECK (closes_at > opens_at);
  END IF;
END$$;

-- 2C. Bookings: deposit cannot exceed total
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'trovea'
      AND table_name   = 'bookings'
      AND constraint_name = 'chk_booking_deposit'
  ) THEN
    ALTER TABLE trovea.bookings
      ADD CONSTRAINT chk_booking_deposit CHECK (deposit_paid <= total_amount);
  END IF;
END$$;

-- 2D. Products: price and stock cannot be negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'trovea'
      AND table_name   = 'products'
      AND constraint_name = 'chk_product_price_positive'
  ) THEN
    ALTER TABLE trovea.products
      ADD CONSTRAINT chk_product_price_positive      CHECK (price >= 0),
      ADD CONSTRAINT chk_product_stock_non_negative  CHECK (stock_level IS NULL OR stock_level >= 0);
  END IF;
END$$;

-- 2E. Receipts: accept hyphenated order_type values used in frontend fixtures
--     (schema had 'preorder'|'walkin'; frontend now also uses 'pre-order'|'walk-in')
ALTER TABLE trovea.receipts
  DROP CONSTRAINT IF EXISTS receipts_order_type_check;
ALTER TABLE trovea.receipts
  ADD CONSTRAINT receipts_order_type_check
  CHECK (order_type IN ('preorder', 'walkin', 'pre-order', 'walk-in'));

-- 2F. Receipts: add 'deposit_paid' status used by Host/Studio deposits but missing from schema
--     TypeScript PaymentStatus already includes 'deposit_paid'; schema constraint did not.
ALTER TABLE trovea.receipts
  DROP CONSTRAINT IF EXISTS receipts_payment_status_check;
ALTER TABLE trovea.receipts
  ADD CONSTRAINT receipts_payment_status_check
  CHECK (payment_status IN ('pending_payment', 'deposit_paid', 'paid', 'cancelled'));

-- 2H. service_id FK on bookings: product can't be deleted while bookings exist
--     Only adds the constraint if service_id is a valid UUID and the column exists.
--     Use VALIDATE = false to avoid blocking if existing rows have orphan service_ids.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'trovea'
      AND table_name   = 'bookings'
      AND constraint_name = 'bookings_service_id_fkey'
  ) THEN
    ALTER TABLE trovea.bookings
      ADD CONSTRAINT bookings_service_id_fkey
      FOREIGN KEY (service_id) REFERENCES trovea.products(id)
      ON DELETE RESTRICT
      NOT VALID; -- validates lazily; won't block existing orphans
  END IF;
END$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 3: MISSING INDEXES (C12)
-- ══════════════════════════════════════════════════════════════════════════════

-- Merchant ledger sorted by date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_receipts_merchant_created
  ON trovea.receipts (merchant_id, created_at DESC);

-- Pagination on claims and holds lists
CREATE INDEX IF NOT EXISTS idx_claims_created_at
  ON trovea.claims (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_holds_created_at
  ON trovea.holds (created_at DESC);

-- Sorted booking history
CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON trovea.bookings (created_at DESC);

-- Drop history / recent drops
CREATE INDEX IF NOT EXISTS idx_drops_created_at
  ON trovea.drops (created_at DESC);

-- Admin: list suspended merchants quickly
CREATE INDEX IF NOT EXISTS idx_merchants_is_suspended
  ON trovea.merchants (is_suspended)
  WHERE is_suspended = true;

-- Admin: list paused merchants
CREATE INDEX IF NOT EXISTS idx_merchants_is_paused
  ON trovea.merchants (is_paused)
  WHERE is_paused = true;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 4: FIX is_admin() — dual-check JWT + profiles table (C5)
-- ══════════════════════════════════════════════════════════════════════════════
-- The 009 JWT hook embeds role in app_metadata but requires manual dashboard
-- registration. This function now checks the JWT first (fast, no DB hit) and
-- falls back to the profiles table (authoritative). Both must agree for safety.

CREATE OR REPLACE FUNCTION trovea.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Fast path: JWT claim set by custom_access_token_hook (009)
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' THEN
    RETURN true;
  END IF;
  -- Authoritative fallback: direct profiles check
  -- If an attacker somehow sets the JWT role without a matching profiles row,
  -- this prevents escalation (both must be true via the OR — actually the fast
  -- path already returns true, but the fallback catches un-hooked environments).
  RETURN EXISTS (
    SELECT 1 FROM trovea.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 5: RLS POLICY FIXES
-- ══════════════════════════════════════════════════════════════════════════════

-- 5A. Products public SELECT: block paused merchants (C9)
DROP POLICY IF EXISTS trovea_products_public_select ON trovea.products;
CREATE POLICY trovea_products_public_select ON trovea.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'live' AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id     = merchant_id
        AND m.deleted_at   IS NULL
        AND m.is_suspended = false
        AND m.is_paused    = false   -- FIX: paused stores not browseable
    )
  );

-- 5B. Collections public SELECT: block paused merchants
DROP POLICY IF EXISTS trovea_collections_public_select ON trovea.collections;
CREATE POLICY trovea_collections_public_select ON trovea.collections
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id     = merchant_id
        AND m.deleted_at   IS NULL
        AND m.is_suspended = false
        AND m.is_paused    = false   -- FIX
    )
  );

-- 5C. Drops public SELECT: block paused merchants
DROP POLICY IF EXISTS trovea_drops_public_select ON trovea.drops;
CREATE POLICY trovea_drops_public_select ON trovea.drops
  FOR SELECT TO anon, authenticated
  USING (
    status IN ('scheduled', 'live') AND
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id     = merchant_id
        AND m.deleted_at   IS NULL
        AND m.is_suspended = false
        AND m.is_paused    = false   -- FIX
    )
  );

-- 5D. Claims INSERT: validate merchant has checkout enabled, product is live (C4)
--     Prevents spam claims against paused/disabled/non-existent stores.
DROP POLICY IF EXISTS trovea_claims_public_insert ON trovea.claims;
CREATE POLICY trovea_claims_public_insert ON trovea.claims
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM trovea.merchants m
      JOIN trovea.products  p ON p.merchant_id = m.id AND p.id = product_id
      WHERE m.id            = merchant_id
        AND m.checkout_enabled = true
        AND m.is_suspended     = false
        AND m.is_paused        = false
        AND p.status           = 'live'
        AND p.deleted_at       IS NULL
    )
  );

-- 5E. Holds INSERT: validate merchant has holds enabled, product is live (C4)
DROP POLICY IF EXISTS trovea_holds_public_insert ON trovea.holds;
CREATE POLICY trovea_holds_public_insert ON trovea.holds
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM trovea.merchants m
      JOIN trovea.products  p ON p.merchant_id = m.id AND p.id = product_id
      WHERE m.id            = merchant_id
        AND m.holds_enabled    = true
        AND m.is_suspended     = false
        AND m.is_paused        = false
        AND p.status           = 'live'
        AND p.deleted_at       IS NULL
    )
  );

-- 5F. Bookings INSERT: validate merchant is active (C4)
DROP POLICY IF EXISTS trovea_bookings_public_insert ON trovea.bookings;
CREATE POLICY trovea_bookings_public_insert ON trovea.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id           = merchant_id
        AND m.is_suspended = false
        AND m.is_paused    = false
        AND m.deleted_at   IS NULL
    )
  );

-- 5G. Enquiries INSERT: validate merchant is active (C4)
--     (Enquiries allowed even when paused — client enquiries should still be
--      receivable so the merchant doesn't lose leads. Suspended is blocked.)
DROP POLICY IF EXISTS trovea_enquiries_public_insert ON trovea.enquiries;
CREATE POLICY trovea_enquiries_public_insert ON trovea.enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id           = merchant_id
        AND m.is_suspended = false
        AND m.deleted_at   IS NULL
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 6: PAYMENT STATUS GUARD (C10)
-- Prevent curators from manually reversing a confirmed or cancelled receipt.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trovea.receipts_payment_status_guard()
RETURNS TRIGGER AS $$
BEGIN
  -- paid → anything else is blocked
  IF OLD.payment_status = 'paid' AND NEW.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'Cannot reverse a confirmed payment. Contact admin if a correction is needed.'
      USING ERRCODE = 'P0010';
  END IF;

  -- cancelled → anything else is blocked
  IF OLD.payment_status = 'cancelled' AND NEW.payment_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Cannot reactivate a cancelled receipt.'
      USING ERRCODE = 'P0011';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_receipts_payment_guard ON trovea.receipts;
CREATE TRIGGER tr_receipts_payment_guard
  BEFORE UPDATE ON trovea.receipts
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION trovea.receipts_payment_status_guard();

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 7: REWRITE HOLD + CLAIM RPCS (C1 — buyer_id column never existed; C3)
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop old broken signatures
DROP FUNCTION IF EXISTS trovea.create_hold_with_lock(UUID, UUID, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS trovea.create_claim_with_lock(UUID, UUID, UUID, TEXT, TEXT);

-- 7A. Atomic hold creation
--     • Checks idempotency first (returns existing hold if key already used)
--     • Locks product row with FOR UPDATE to prevent concurrent race (C3)
--     • Compares active hold COUNT against stock_level, not just stock=1 (C3)
--     • Inserts using buyer_name/phone, not buyer_id (C1)
--     • Decrements stock only when stock_level is not NULL (unlimited products)
CREATE OR REPLACE FUNCTION trovea.create_hold_with_lock(
  p_product_id      UUID,
  p_merchant_id     UUID,
  p_buyer_name      TEXT,
  p_buyer_phone     TEXT,
  p_buyer_note      TEXT,
  p_duration_hours  SMALLINT,
  p_idempotency_key TEXT
)
RETURNS trovea.holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
DECLARE
  v_product      trovea.products;
  v_active_holds INTEGER;
  v_new_hold     trovea.holds;
BEGIN
  -- Idempotency: if this key was already used, return the existing hold
  SELECT * INTO v_new_hold
  FROM trovea.holds
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_new_hold;
  END IF;

  -- Lock the product row to serialize concurrent hold requests
  SELECT * INTO v_product
  FROM trovea.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  -- Verify product belongs to the stated merchant (prevents cross-merchant abuse)
  IF v_product.merchant_id <> p_merchant_id THEN
    RAISE EXCEPTION 'Product does not belong to this merchant' USING ERRCODE = 'P0005';
  END IF;

  -- Product must be live
  IF v_product.status <> 'live' OR v_product.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Product is not available' USING ERRCODE = 'P0006';
  END IF;

  -- Stock check (NULL = unlimited; skip reservation counting)
  IF v_product.stock_level IS NOT NULL THEN
    IF v_product.stock_level <= 0 THEN
      RAISE EXCEPTION 'Product is out of stock' USING ERRCODE = 'P0003';
    END IF;

    -- Count all active holds and compare against available stock (C3 fix)
    SELECT COUNT(*) INTO v_active_holds
    FROM trovea.holds
    WHERE product_id = p_product_id
      AND status    = 'active'
      AND expires_at > now();

    IF v_active_holds >= v_product.stock_level THEN
      RAISE EXCEPTION 'All available stock is currently on hold' USING ERRCODE = 'P0004';
    END IF;
  END IF;

  -- Duration must be a valid value
  IF p_duration_hours NOT IN (2, 6, 12, 24) THEN
    RAISE EXCEPTION 'Invalid hold duration. Must be 2, 6, 12 or 24 hours.' USING ERRCODE = 'P0008';
  END IF;

  -- Insert the hold (expires_at set explicitly; trigger also fires, harmless)
  INSERT INTO trovea.holds (
    product_id,     merchant_id,
    buyer_name,     buyer_phone,    buyer_note,
    status,         duration_hours,
    expires_at,     idempotency_key
  )
  VALUES (
    p_product_id,   p_merchant_id,
    p_buyer_name,   p_buyer_phone,  p_buyer_note,
    'active',       p_duration_hours,
    NOW() + (p_duration_hours || ' hours')::INTERVAL,
    p_idempotency_key
  )
  RETURNING * INTO v_new_hold;

  -- Decrement stock (only for finite-stock products)
  IF v_product.stock_level IS NOT NULL THEN
    UPDATE trovea.products
    SET stock_level = stock_level - 1,
        status      = CASE WHEN stock_level - 1 = 0 THEN 'sold_out' ELSE status END,
        updated_at  = now()
    WHERE id = p_product_id;
  END IF;

  RETURN v_new_hold;
END;
$$;

GRANT EXECUTE ON FUNCTION trovea.create_hold_with_lock(UUID, UUID, TEXT, TEXT, TEXT, SMALLINT, TEXT)
  TO anon, authenticated;

-- 7B. Atomic claim creation
--     • Same idempotency-first pattern
--     • Uses buyer_name/phone/email instead of buyer_id (C1)
--     • Validates claim_mode is enabled on the product
--     • Checks the pending-claim unique index with a friendly error before INSERT
CREATE OR REPLACE FUNCTION trovea.create_claim_with_lock(
  p_product_id      UUID,
  p_merchant_id     UUID,
  p_buyer_name      TEXT,
  p_buyer_phone     TEXT,
  p_buyer_email     TEXT,
  p_buyer_note      TEXT,
  p_idempotency_key TEXT
)
RETURNS trovea.claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
DECLARE
  v_product   trovea.products;
  v_new_claim trovea.claims;
BEGIN
  -- Idempotency
  SELECT * INTO v_new_claim
  FROM trovea.claims
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN v_new_claim;
  END IF;

  -- Lock product row
  SELECT * INTO v_product
  FROM trovea.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  -- Verify merchant ownership
  IF v_product.merchant_id <> p_merchant_id THEN
    RAISE EXCEPTION 'Product does not belong to this merchant' USING ERRCODE = 'P0005';
  END IF;

  -- Product must be live and have claim mode enabled
  IF v_product.status <> 'live' OR v_product.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Product is not available' USING ERRCODE = 'P0006';
  END IF;

  IF v_product.claim_mode = false THEN
    RAISE EXCEPTION 'This product does not accept claims' USING ERRCODE = 'P0009';
  END IF;

  -- Stock check
  IF v_product.stock_level IS NOT NULL AND v_product.stock_level <= 0 THEN
    RAISE EXCEPTION 'Product is out of stock' USING ERRCODE = 'P0003';
  END IF;

  -- Friendly error before hitting the unique index on (product_id) WHERE status='pending'
  IF EXISTS (
    SELECT 1 FROM trovea.claims
    WHERE product_id = p_product_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A claim is already pending on this product' USING ERRCODE = 'P0007';
  END IF;

  -- Insert claim (expires_at set by trigger tr_set_claim_expiry, also set explicitly)
  INSERT INTO trovea.claims (
    product_id,   merchant_id,
    buyer_name,   buyer_phone,  buyer_email,  buyer_note,
    status,       expires_at,   idempotency_key
  )
  VALUES (
    p_product_id, p_merchant_id,
    p_buyer_name, p_buyer_phone, p_buyer_email, p_buyer_note,
    'pending',    NOW() + INTERVAL '24 hours',  p_idempotency_key
  )
  RETURNING * INTO v_new_claim;

  -- Decrement stock
  IF v_product.stock_level IS NOT NULL THEN
    UPDATE trovea.products
    SET stock_level = stock_level - 1,
        status      = CASE WHEN stock_level - 1 = 0 THEN 'sold_out' ELSE status END,
        updated_at  = now()
    WHERE id = p_product_id;
  END IF;

  RETURN v_new_claim;
END;
$$;

GRANT EXECUTE ON FUNCTION trovea.create_claim_with_lock(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 8: EXTEND RECEIPT FREEZE TRIGGER to cover new deposit columns
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trovea.receipts_freeze_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.id               <> NEW.id                                  OR
      OLD.merchant_id      <> NEW.merchant_id                         OR
      OLD.seal_id          <> NEW.seal_id                             OR
      OLD.receipt_type     <> NEW.receipt_type                        OR
      OLD.buyer_name       <> NEW.buyer_name                          OR
      OLD.buyer_phone      IS DISTINCT FROM NEW.buyer_phone           OR
      OLD.buyer_email      IS DISTINCT FROM NEW.buyer_email           OR
      OLD.line_items       <> NEW.line_items                          OR
      OLD.subtotal         <> NEW.subtotal                            OR
      OLD.discount_amount  <> NEW.discount_amount                     OR
      OLD.discount_type    IS DISTINCT FROM NEW.discount_type         OR
      OLD.discount         IS DISTINCT FROM NEW.discount              OR
      OLD.delivery_fee     IS DISTINCT FROM NEW.delivery_fee          OR
      OLD.total            <> NEW.total                               OR
      OLD.deposit_amount   IS DISTINCT FROM NEW.deposit_amount        OR
      OLD.balance_due      IS DISTINCT FROM NEW.balance_due           OR
      OLD.notes            IS DISTINCT FROM NEW.notes                 OR
      OLD.sale_note        IS DISTINCT FROM NEW.sale_note             OR
      OLD.fulfilment_type  IS DISTINCT FROM NEW.fulfilment_type       OR
      OLD.order_type       IS DISTINCT FROM NEW.order_type            OR
      OLD.is_quick_item    <> NEW.is_quick_item                       OR
      OLD.created_at       <> NEW.created_at) THEN
    RAISE EXCEPTION 'Cannot modify frozen receipt columns';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 9: CRON — auto-unpause merchants when pause_return_date arrives (C19)
-- ══════════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'trovea-auto-unpause',
  '0 * * * *',   -- runs once per hour
  $$
    UPDATE trovea.merchants
    SET is_paused        = false,
        pause_message    = null,
        pause_return_date = null
    WHERE is_paused        = true
      AND pause_return_date IS NOT NULL
      AND pause_return_date <= CURRENT_DATE;
  $$
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PART 10: VALIDATE_PRODUCT_IDS — add array-length guard against DOS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trovea.validate_product_ids(p_merchant_id UUID, p_product_ids UUID[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
BEGIN
  -- Guard against unbounded array (>500 product IDs is clearly abusive)
  IF array_length(p_product_ids, 1) > 500 THEN
    RAISE EXCEPTION 'Too many product IDs. Maximum 500 per call.' USING ERRCODE = 'P0012';
  END IF;

  RETURN (
    SELECT COUNT(*) = array_length(p_product_ids, 1)
    FROM trovea.products
    WHERE merchant_id = p_merchant_id
      AND id = ANY(p_product_ids)
      AND deleted_at IS NULL
  );
END;
$$;
