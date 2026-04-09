-- RPCs for checking active holds and pending claims
-- Used by the public storefront to prevent duplicate reservations

-- 1. Get active hold for a product
CREATE OR REPLACE FUNCTION trovea.get_active_hold_for_product(p_product_id UUID)
RETURNS SETOF trovea.holds LANGUAGE sql SECURITY DEFINER SET search_path = trovea AS $$
  SELECT * FROM trovea.holds
  WHERE product_id = p_product_id
    AND status = 'active'
    AND expires_at > now()
  LIMIT 1;
$$;

-- 2. Get pending claim for a product
CREATE OR REPLACE FUNCTION trovea.get_pending_claim_for_product(p_product_id UUID)
RETURNS SETOF trovea.claims LANGUAGE sql SECURITY DEFINER SET search_path = trovea AS $$
  SELECT * FROM trovea.claims
  WHERE product_id = p_product_id
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION trovea.get_active_hold_for_product(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION trovea.get_pending_claim_for_product(UUID) TO anon, authenticated;
