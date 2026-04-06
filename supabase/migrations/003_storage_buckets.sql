-- Trovéa Storage Buckets
-- Generated: 2026-04-05

-- ─── BUCKET CREATION ───────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('merchant-avatars', 'merchant-avatars', true, 512000, ARRAY['image/jpeg','image/png','image/webp']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('portfolio-images', 'portfolio-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('hero-images', 'hero-images', true, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('digital-products', 'digital-products', false, 524288000, NULL),
  ('claim-proofs', 'claim-proofs', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','application/pdf']);

-- ─── STORAGE POLICIES ─────────────────────────────────────────────────────

-- Public access to public buckets
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('merchant-avatars', 'product-images', 'portfolio-images', 'hero-images'));

-- Curator upload/edit access to their own folders
-- Folder name convention: {merchant_id}/...
CREATE POLICY "Curator Manage Own Files" ON storage.objects
  FOR ALL TO authenticated
  USING (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM trovea.merchants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM trovea.merchants WHERE owner_id = auth.uid()
    )
  );

-- Digital Products - Private signed URLs (Real version in Phase 3C)
CREATE POLICY "Digital Products Private" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'digital-products' AND
    EXISTS (
      SELECT 1 FROM trovea.receipts r
      WHERE r.merchant_id::text = (storage.foldername(name))[1]
      AND r.payment_status = 'paid'
      AND (auth.jwt()->>'email' = r.buyer_email) -- Simplified check
    )
  );

-- Claim Proofs - Admin and Merchant access
CREATE POLICY "Claim Proofs Access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'claim-proofs' AND (
      EXISTS (
        SELECT 1 FROM trovea.merchants m
        WHERE m.id::text = (storage.foldername(name))[1]
        AND m.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM trovea.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    )
  );
