-- Migration: 010_concurrency_and_idempotency
-- Adds idempotency keys and atomic locking RPCs for holds and claims

-- 1. Add idempotency keys
ALTER TABLE trovea.holds ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE trovea.claims ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 2. Atomic Hold RPC
CREATE OR REPLACE FUNCTION trovea.create_hold_with_lock(
  p_product_id UUID,
  p_buyer_id UUID,
  p_expires_at TIMESTAMPTZ,
  p_idempotency_key TEXT
)
RETURNS trovea.holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
DECLARE
  v_product_row trovea.products;
  v_new_hold trovea.holds;
BEGIN
  -- 1. Lock the product row immediately to prevent concurrent modifications
  SELECT * INTO v_product_row
  FROM trovea.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Check stock level
  IF v_product_row.stock_level <= 0 THEN
    RAISE EXCEPTION 'Product out of stock' USING ERRCODE = 'P0003';
  END IF;

  -- 3. Check for existing active hold by this user or others (if stock is 1)
  -- (Assuming 1-of-1 items for simplicity in this MVP logic, 
  -- but adaptable for multi-stock by checking aggregate active holds)
  IF EXISTS (
    SELECT 1 FROM trovea.holds 
    WHERE product_id = p_product_id AND status = 'active' AND expires_at > now()
  ) AND v_product_row.stock_level = 1 THEN
    RAISE EXCEPTION 'Item already on hold' USING ERRCODE = 'P0004';
  END IF;

  -- 4. Insert the hold, handling idempotency key conflict
  BEGIN
    INSERT INTO trovea.holds (product_id, buyer_id, status, expires_at, idempotency_key)
    VALUES (p_product_id, p_buyer_id, 'active', p_expires_at, p_idempotency_key)
    RETURNING * INTO v_new_hold;
  EXCEPTION WHEN unique_violation THEN
    -- If idempotency key matches, return the existing hold
    SELECT * INTO v_new_hold FROM trovea.holds WHERE idempotency_key = p_idempotency_key;
    RETURN v_new_hold;
  END;

  -- 5. Decrement stock
  UPDATE trovea.products 
  SET stock_level = stock_level - 1, updated_at = now()
  WHERE id = p_product_id;

  RETURN v_new_hold;
END;
$$;

-- 3. Atomic Claim RPC
CREATE OR REPLACE FUNCTION trovea.create_claim_with_lock(
  p_product_id UUID,
  p_merchant_id UUID,
  p_buyer_id UUID,
  p_variant_label TEXT,
  p_idempotency_key TEXT
)
RETURNS trovea.claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
DECLARE
  v_product_row trovea.products;
  v_new_claim trovea.claims;
BEGIN
  -- 1. Lock product
  SELECT * INTO v_product_row
  FROM trovea.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_product_row.stock_level <= 0 THEN
    RAISE EXCEPTION 'Product out of stock' USING ERRCODE = 'P0003';
  END IF;

  -- 2. Insert claim
  BEGIN
    INSERT INTO trovea.claims (product_id, merchant_id, buyer_id, status, variant_label, expires_at, idempotency_key)
    VALUES (p_product_id, p_merchant_id, p_buyer_id, 'pending', p_variant_label, now() + interval '24 hours', p_idempotency_key)
    RETURNING * INTO v_new_claim;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_new_claim FROM trovea.claims WHERE idempotency_key = p_idempotency_key;
    RETURN v_new_claim;
  END;

  -- 3. Decrement stock
  UPDATE trovea.products 
  SET stock_level = stock_level - 1, updated_at = now()
  WHERE id = p_product_id;

  RETURN v_new_claim;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION trovea.create_hold_with_lock(UUID, UUID, TIMESTAMPTZ, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trovea.create_claim_with_lock(UUID, UUID, UUID, TEXT, TEXT) TO anon, authenticated;
