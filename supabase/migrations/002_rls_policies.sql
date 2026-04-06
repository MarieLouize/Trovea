-- Trovéa RLS Policies
-- Generated: 2026-04-05

-- ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trovea.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trovea.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 1. PROFILES ──────────────────────────────────────────────────────────

ALTER TABLE trovea.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_profiles_select ON trovea.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR trovea.is_admin());

CREATE POLICY trovea_profiles_update ON trovea.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR trovea.is_admin())
  WITH CHECK (
    (id = auth.uid() AND (role = (SELECT role FROM trovea.profiles WHERE id = auth.uid()))) -- User cannot change own role
    OR trovea.is_admin()
  );

-- ─── 2. MERCHANTS ─────────────────────────────────────────────────────────

ALTER TABLE trovea.merchants ENABLE ROW LEVEL SECURITY;

-- Public can see basic info of active stores
CREATE POLICY trovea_merchants_public_select ON trovea.merchants
  FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL AND is_suspended = false);

-- Curators can see all their own merchant data
CREATE POLICY trovea_merchants_curator_select ON trovea.merchants
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR trovea.is_admin());

-- Only curators can create a merchant
CREATE POLICY trovea_merchants_curator_insert ON trovea.merchants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM trovea.profiles WHERE id = auth.uid() AND role = 'curator')
    AND owner_id = auth.uid()
  );

-- Curators can update their own merchant
CREATE POLICY trovea_merchants_curator_update ON trovea.merchants
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR trovea.is_admin())
  WITH CHECK (
    (owner_id = auth.uid() AND (
      handle = (SELECT handle FROM trovea.merchants WHERE owner_id = auth.uid()) AND
      store_type = (SELECT store_type FROM trovea.merchants WHERE owner_id = auth.uid()) AND
      verification_tier = (SELECT verification_tier FROM trovea.merchants WHERE owner_id = auth.uid()) AND
      is_suspended = (SELECT is_suspended FROM trovea.merchants WHERE owner_id = auth.uid()) AND
      deleted_at IS NULL
    ))
    OR trovea.is_admin()
  );

-- ─── 3. COLLECTIONS ───────────────────────────────────────────────────────

ALTER TABLE trovea.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_collections_public_select ON trovea.collections
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id = merchant_id AND m.deleted_at IS NULL AND m.is_suspended = false
    )
  );

CREATE POLICY trovea_collections_curator_all ON trovea.collections
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- ─── 4. PRODUCTS ──────────────────────────────────────────────────────────

ALTER TABLE trovea.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_products_public_select ON trovea.products
  FOR SELECT TO anon, authenticated
  USING (
    status = 'live' AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id = merchant_id AND m.deleted_at IS NULL AND m.is_suspended = false
    )
  );

CREATE POLICY trovea_products_curator_all ON trovea.products
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- ─── 5. RECEIPTS ──────────────────────────────────────────────────────────

ALTER TABLE trovea.receipts ENABLE ROW LEVEL SECURITY;

-- No direct SELECT for anon (uses RPC)
-- Curator can see own receipts
CREATE POLICY trovea_receipts_curator_select ON trovea.receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

CREATE POLICY trovea_receipts_curator_insert ON trovea.receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
  );

CREATE POLICY trovea_receipts_curator_update ON trovea.receipts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- PUBLIC RECEIPT LOOKUP RPC
CREATE OR REPLACE FUNCTION trovea.get_receipt_by_seal_id(p_seal_id TEXT)
RETURNS SETOF trovea.receipts
LANGUAGE sql
SECURITY DEFINER
SET search_path = trovea
AS $$
  SELECT * FROM trovea.receipts WHERE seal_id = p_seal_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION trovea.get_receipt_by_seal_id(TEXT) TO anon, authenticated;

-- VALIDATE PRODUCT IDS FUNCTION
-- Checks if all provided product IDs belong to the merchant
CREATE OR REPLACE FUNCTION trovea.validate_product_ids(p_merchant_id UUID, p_product_ids UUID[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = trovea
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) = array_length(p_product_ids, 1)
    FROM trovea.products
    WHERE merchant_id = p_merchant_id
    AND id = ANY(p_product_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION trovea.validate_product_ids(UUID, UUID[]) TO authenticated;

-- ─── 6. CLAIMS ────────────────────────────────────────────────────────────

ALTER TABLE trovea.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_claims_public_insert ON trovea.claims
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY trovea_claims_curator_all ON trovea.claims
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- ─── 7. HOLDS ─────────────────────────────────────────────────────────────

ALTER TABLE trovea.holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_holds_public_insert ON trovea.holds
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY trovea_holds_curator_all ON trovea.holds
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- ─── 8. DROPS ─────────────────────────────────────────────────────────────

ALTER TABLE trovea.drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_drops_public_select ON trovea.drops
  FOR SELECT TO anon, authenticated
  USING (
    status IN ('scheduled', 'live') AND
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id = merchant_id AND m.deleted_at IS NULL AND m.is_suspended = false
    )
  );

CREATE POLICY trovea_drops_curator_all ON trovea.drops
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

CREATE POLICY trovea_drops_curator_delete ON trovea.drops
  FOR DELETE TO authenticated
  USING (
    status = 'draft' AND
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
  );

-- ─── 9. AVAILABILITY WINDOWS ──────────────────────────────────────────────

ALTER TABLE trovea.availability_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_windows_public_select ON trovea.availability_windows
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trovea.merchants m
      WHERE m.id = merchant_id AND m.deleted_at IS NULL AND m.is_suspended = false
    )
  );

CREATE POLICY trovea_windows_curator_all ON trovea.availability_windows
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

CREATE POLICY trovea_windows_curator_delete ON trovea.availability_windows
  FOR DELETE TO authenticated
  USING (
    status = 'upcoming' AND
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
  );

-- ─── 10. BOOKINGS ─────────────────────────────────────────────────────────

ALTER TABLE trovea.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_bookings_public_insert ON trovea.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY trovea_bookings_curator_all ON trovea.bookings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- ─── 11. ENQUIRIES ────────────────────────────────────────────────────────

ALTER TABLE trovea.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_enquiries_public_insert ON trovea.enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY trovea_enquiries_curator_all ON trovea.enquiries
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM trovea.merchants m WHERE m.id = merchant_id AND m.owner_id = auth.uid())
    OR trovea.is_admin()
  );

-- ─── 12. STORE REPORTS ────────────────────────────────────────────────────

ALTER TABLE trovea.store_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_reports_public_insert ON trovea.store_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY trovea_reports_admin_all ON trovea.store_reports
  FOR ALL TO authenticated
  USING (trovea.is_admin());

-- ─── 13. ADMIN LOG ────────────────────────────────────────────────────────

ALTER TABLE trovea.admin_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY trovea_admin_log_admin_all ON trovea.admin_log
  FOR ALL TO authenticated
  USING (trovea.is_admin());
