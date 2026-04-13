-- Trovéa Seed Data
-- Generated: 2026-04-05
-- This script populates the database with fixture data for development.

BEGIN;

-- ─── 0. HELPERS ───────────────────────────────────────────────────────────
-- Function to convert fixture IDs to UUIDs for consistency
CREATE OR REPLACE FUNCTION trovea.seed_uuid(p_id TEXT) RETURNS UUID AS $$
BEGIN
  RETURN ('00000000-0000-0000-0000-' || LPAD(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(p_id, 'user-', 'A'), 'merchant-', 'B'), 'product-', 'C'), 'col-', 'D'), 'receipt-', 'E'), 'claim-', 'F'), 'hold-', '1'), 'drop-', '2'), 'window-', '3'), 'booking-', '4'), 'enquiry-', '5'), 'report-', '6'), 'menu-', '7'), 'svc-', '8'), 'dig-', '9'), 'pkg-', '0'), 12, '0'))::UUID;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. AUTH USERS (Mock) ────────────────────────────────────────────────
-- In a real Supabase environment, these would be in the auth.users table.
-- We insert them here to satisfy foreign key constraints for the seed.
-- NOTE: This usually requires superuser/service_role.
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
  (trovea.seed_uuid('user-001'), 'tola@example.com', '{"display_name":"Tola Adeyemi"}'::jsonb),
  (trovea.seed_uuid('user-002'), 'tobi@example.com', '{"display_name":"Tobiloba Adeyemi"}'::jsonb),
  (trovea.seed_uuid('user-003'), 'chisom@example.com', '{"display_name":"Chisom Eze"}'::jsonb),
  (trovea.seed_uuid('user-004'), 'femi@example.com', '{"display_name":"Femi Ogundimu"}'::jsonb),
  (trovea.seed_uuid('user-005'), 'ngozi@example.com', '{"display_name":"Ngozi Abubakar"}'::jsonb),
  (trovea.seed_uuid('user-999'), 'admin@trovea.com', '{"display_name":"Trovéa Admin"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. PROFILES ──────────────────────────────────────────────────────────
-- Profiles are normally created by a trigger, but we insert them here to ensure specific roles.
INSERT INTO trovea.profiles (id, display_name, role, whatsapp)
VALUES
  (trovea.seed_uuid('user-001'), 'Tola Adeyemi', 'curator', '+2348012345678'),
  (trovea.seed_uuid('user-002'), 'Tobiloba Adeyemi', 'curator', '+2348023456789'),
  (trovea.seed_uuid('user-003'), 'Chisom Eze', 'curator', '+2348034567890'),
  (trovea.seed_uuid('user-004'), 'Femi Ogundimu', 'curator', '+2348045678901'),
  (trovea.seed_uuid('user-005'), 'Ngozi Abubakar', 'curator', '+2348056789012'),
  (trovea.seed_uuid('user-999'), 'Trovéa Admin', 'admin', NULL)
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- ─── 3. MERCHANTS ─────────────────────────────────────────────────────────
INSERT INTO trovea.merchants (id, owner_id, display_name, store_name, handle, store_type, whatsapp, bio, avatar_url, social_links, portfolio_images, arrival_notes, response_time_hours, store_open, store_config, verification_tier, is_paused, checkout_enabled, holds_enabled, hold_duration_hours, bank_account)
VALUES
  (trovea.seed_uuid('merchant-001'), trovea.seed_uuid('user-001'), 'Tola Adeyemi', 'Tola''s Archive', 'tolasarchive', 'collector', '+2348012345678', 'Curated thrift & vintage finds. New bales weekly. Based in Lagos.', 'https://i.pravatar.cc/150?img=47', '{"instagram":"tolasarchive","twitter":null,"tiktok":"tolasarchive"}'::jsonb, '{}', NULL, 24, true, '{"signature":"the-bale","layout":"grid-dense","palette":"maroon","typography":"editorial","card_style":"clean-square","section_order":["section-header","section-featured","section-grid","section-contact"],"section_states":{"section-hero":false,"section-about":true,"section-slots":false,"section-featured":true},"hero_image_url":null,"featured_item_ids":["product-001","product-003","product-007"],"about_text":"Every piece in this archive has been personally sourced and vetted. No reproductions. No fast fashion. Just quality pieces that deserve a second life.","item_display_order":null,"store_type_config":{"drop_banner_text":null,"sold_out_overlay_style":"dim","preview_state":"static","window_banner_text":null,"preorder_cta_text":"Pre-order","dormant_message":null,"dormant_image_url":null,"booking_cta_text":"Book a Slot","calendar_format":"week","portfolio_density":"medium","price_prominence":"prominent","catalogue_display":"grid","free_badge_style":"pill","currency_display":"ngn","portfolio_layout":"masonry","enquiry_form_fields":["event_type","date","location","budget_range"],"package_card_style":"full","portfolio_order":"curated","client_logos_enabled":false}}'::jsonb, 'verified', false, false, true, 24, NULL),
  (trovea.seed_uuid('merchant-002'), trovea.seed_uuid('user-002'), 'Tobiloba Adeyemi', 'Tobi Eats', 'tobieats', 'vendor', '+2348023456789', 'Weekend food drops. Jollof rice, peppered snail, small chops. Ibadan.', 'https://i.pravatar.cc/150?img=12', '{"instagram":"tobieats","twitter":null,"tiktok":null}'::jsonb, '{}', NULL, 2, true, '{"signature":"the-atelier","layout":"minimal","palette":"parchment","typography":"warm","card_style":"minimal-line","section_order":["section-header","section-featured","section-grid","section-contact"],"section_states":{"section-hero":false,"section-about":true,"section-slots":false,"section-featured":false},"hero_image_url":null,"featured_item_ids":[],"about_text":"Weekend food drops. Order closes Friday midnight. Cook day: Saturday. Pickup or delivery within Ibadan.","item_display_order":null,"store_type_config":{"drop_banner_text":null,"sold_out_overlay_style":"dim","preview_state":"static","window_banner_text":"Orders close Friday midnight. Cook day: Saturday.","preorder_cta_text":"Pre-order","dormant_message":"Next window coming soon — follow on Instagram for dates.","dormant_image_url":null,"booking_cta_text":"Book a Slot","calendar_format":"week","portfolio_density":"medium","price_prominence":"prominent","catalogue_display":"grid","free_badge_style":"pill","currency_display":"ngn","portfolio_layout":"masonry","enquiry_form_fields":["event_type","date","location","budget_range"],"package_card_style":"full","portfolio_order":"curated","client_logos_enabled":false}}'::jsonb, 'verified', false, true, false, 24, '{"account_number":"0123456789","bank_name":"Opay","account_name":"Tobiloba Adeyemi"}'::jsonb),
  (trovea.seed_uuid('merchant-003'), trovea.seed_uuid('user-003'), 'Chisom Eze', 'Chisom Beauty', 'chisombeauty', 'host', '+2348034567890', 'Lash tech & brow artist. Home studio, Abuja (Wuse 2). Results speak.', 'https://i.pravatar.cc/150?img=23', '{"instagram":"chisombeauty","twitter":null,"tiktok":"chisombeauty"}'::jsonb, '{"https://picsum.photos/seed/chisom-port-1/600/600","https://picsum.photos/seed/chisom-port-2/600/600","https://picsum.photos/seed/chisom-port-3/600/600","https://picsum.photos/seed/chisom-port-4/600/600","https://picsum.photos/seed/chisom-port-5/600/600","https://picsum.photos/seed/chisom-port-6/600/600"}', 'Please arrive 5 minutes early. Ring doorbell on arrival.', 4, true, '{"signature":"the-vault","layout":"editorial","palette":"velvet","typography":"editorial","card_style":"rounded-float","section_order":["section-header","section-hero","section-featured","section-grid","section-about","section-contact"],"section_states":{"section-hero":true,"section-about":true,"section-slots":true,"section-featured":false},"hero_image_url":null,"featured_item_ids":[],"about_text":"Home studio based in Wuse 2, Abuja. By appointment only. Lash extensions, volume sets, and brow artistry. Your results are my portfolio.","item_display_order":null,"store_type_config":{"drop_banner_text":null,"sold_out_overlay_style":"dim","preview_state":"static","window_banner_text":null,"preorder_cta_text":"Pre-order","dormant_message":null,"dormant_image_url":null,"booking_cta_text":"Book a Slot","calendar_format":"week","portfolio_density":"medium","price_prominence":"prominent","catalogue_display":"grid","free_badge_style":"pill","currency_display":"ngn","portfolio_layout":"masonry","enquiry_form_fields":["event_type","date","location","budget_range"],"package_card_style":"full","portfolio_order":"curated","client_logos_enabled":false}}'::jsonb, 'trusted', false, true, false, 24, '{"account_number":"9876543210","bank_name":"GTBank","account_name":"Chisom Eze"}'::jsonb),
  (trovea.seed_uuid('merchant-004'), trovea.seed_uuid('user-004'), 'Femi Ogundimu', 'Femi Creates', 'femicreates', 'digital_creator', '+2348045678901', 'Motion designer & Notion builder. Presets, templates, starter kits. Lagos.', 'https://i.pravatar.cc/150?img=33', '{"instagram":"femicreates","twitter":"femicreates","tiktok":null}'::jsonb, '{}', NULL, 24, true, '{"signature":"the-gallery","layout":"grid-airy","palette":"onyx","typography":"modern","card_style":"clean-square","section_order":["section-header","section-featured","section-grid","section-about","section-contact"],"section_states":{"section-hero":false,"section-about":true,"section-slots":false,"section-featured":true},"hero_image_url":null,"featured_item_ids":["dig-001","dig-004"],"about_text":"I make tools that make your workflow feel effortless. Motion presets, Notion systems, and brand kits built for creatives who mean business.","item_display_order":null,"store_type_config":{"drop_banner_text":null,"sold_out_overlay_style":"dim","preview_state":"static","window_banner_text":null,"preorder_cta_text":"Pre-order","dormant_message":null,"dormant_image_url":null,"booking_cta_text":"Book a Slot","calendar_format":"week","portfolio_density":"medium","price_prominence":"prominent","catalogue_display":"grid","free_badge_style":"pill","currency_display":"ngn","portfolio_layout":"masonry","enquiry_form_fields":["event_type","date","location","budget_range"],"package_card_style":"full","portfolio_order":"curated","client_logos_enabled":false}}'::jsonb, 'verified', false, true, false, 24, '{"account_number":"5556667778","bank_name":"Paystack","account_name":"Femi Ogundimu"}'::jsonb),
  (trovea.seed_uuid('merchant-005'), trovea.seed_uuid('user-005'), 'Ngozi Abubakar', 'Ngozi Studio', 'ngozistudio', 'studio', '+2348056789012', 'Brand photographer & creative director. Fashion, food, personal brands. Yaba, Lagos.', 'https://i.pravatar.cc/150?img=44', '{"instagram":"ngozistudio","twitter":null,"tiktok":"ngozistudio"}'::jsonb, '{"https://picsum.photos/seed/ngozi-port-1/800/600","https://picsum.photos/seed/ngozi-port-2/600/800","https://picsum.photos/seed/ngozi-port-3/800/600","https://picsum.photos/seed/ngozi-port-4/600/600","https://picsum.photos/seed/ngozi-port-5/800/600","https://picsum.photos/seed/ngozi-port-6/600/800","https://picsum.photos/seed/ngozi-port-7/800/600","https://picsum.photos/seed/ngozi-port-8/600/600"}', NULL, 24, true, '{"signature":"the-archive","layout":"masonry","palette":"slate","typography":"editorial","card_style":"polaroid","section_order":["section-header","section-hero","section-featured","section-grid","section-about","section-contact"],"section_states":{"section-hero":true,"section-about":true,"section-slots":false,"section-featured":true},"hero_image_url":null,"featured_item_ids":["pkg-001","pkg-002"],"about_text":"Based in Yaba, Lagos. I work with fashion brands, food businesses, and personal brands who want imagery that converts. Every shoot is a collaboration.","item_display_order":null,"store_type_config":{"drop_banner_text":null,"sold_out_overlay_style":"dim","preview_state":"static","window_banner_text":null,"preorder_cta_text":"Pre-order","dormant_message":null,"dormant_image_url":null,"booking_cta_text":"Book a Slot","calendar_format":"week","portfolio_density":"medium","price_prominence":"subdued","catalogue_display":"grid","free_badge_style":"pill","currency_display":"ngn","portfolio_layout":"masonry","enquiry_form_fields":["event_type","date","location","budget_range"],"package_card_style":"full","portfolio_order":"curated","client_logos_enabled":true}}'::jsonb, 'trusted', false, true, false, 24, '{"account_number":"3334445556","bank_name":"Access Bank","account_name":"Ngozi Abubakar"}'::jsonb);

-- ─── 4. COLLECTIONS ───────────────────────────────────────────────────────
INSERT INTO trovea.collections (id, merchant_id, name, color_accent, display_order, slug, description)
VALUES
  (trovea.seed_uuid('col-001'), trovea.seed_uuid('merchant-001'), 'Dresses', '#C0A882', 0, 'dresses', NULL),
  (trovea.seed_uuid('col-002'), trovea.seed_uuid('merchant-001'), 'Tops & Sets', '#8B5E3C', 1, 'tops-and-sets', NULL),
  (trovea.seed_uuid('col-003'), trovea.seed_uuid('merchant-001'), 'Bags', '#4A3728', 2, 'bags', NULL);

-- ─── 5. PRODUCTS ──────────────────────────────────────────────────────────
-- Tola's Products
INSERT INTO trovea.products (id, merchant_id, collection_id, name, price, product_type, stock_level, status, tags, images, has_variants, variant_axis, variants, claim_mode, claim_limit)
VALUES
  (trovea.seed_uuid('product-001'), trovea.seed_uuid('merchant-001'), trovea.seed_uuid('col-001'), 'Ankara Wrap Dress', 22000, 'item', NULL, 'live', '{ankara,dress,wrap}', '{https://picsum.photos/seed/ankara-wrap/400/400}', true, 'Size', '[{"id":"v-001-1","label":"S","price_override":null,"stock_level":0,"status":"live","display_order":0},{"id":"v-001-2","label":"M","price_override":null,"stock_level":1,"status":"live","display_order":1},{"id":"v-001-3","label":"L","price_override":null,"stock_level":1,"status":"live","display_order":2}]'::jsonb, false, NULL),
  (trovea.seed_uuid('product-002'), trovea.seed_uuid('merchant-001'), trovea.seed_uuid('col-001'), 'Vintage Linen Midi Dress', 18500, 'item', 5, 'live', '{linen,vintage,midi}', '{https://picsum.photos/seed/linen-midi/400/400}', false, NULL, NULL, false, NULL),
  (trovea.seed_uuid('product-003'), trovea.seed_uuid('merchant-001'), trovea.seed_uuid('col-001'), 'Printed Adire Slip Dress', 14000, 'item', NULL, 'live', '{adire,slip,printed}', '{https://picsum.photos/seed/adire-slip/400/400}', true, 'Size', '[{"id":"v-003-1","label":"XS","price_override":null,"stock_level":0,"status":"live","display_order":0},{"id":"v-003-2","label":"S","price_override":null,"stock_level":0,"status":"live","display_order":1},{"id":"v-003-3","label":"M","price_override":null,"stock_level":1,"status":"live","display_order":2},{"id":"v-003-4","label":"L","price_override":null,"stock_level":0,"status":"live","display_order":3}]'::jsonb, false, NULL),
  (trovea.seed_uuid('product-007'), trovea.seed_uuid('merchant-001'), trovea.seed_uuid('col-002'), 'Ankara Set — Drop 03', 85000, 'item', 10, 'live', '{ankara,set,limited,drop}', '{https://picsum.photos/seed/ankara-drop3/400/400}', false, NULL, NULL, true, 10),
  (trovea.seed_uuid('product-011'), trovea.seed_uuid('merchant-001'), trovea.seed_uuid('col-002'), 'Hand-dyed Agbada Blouse', 36000, 'item', 1, 'live', '{agbada,hand-dyed,statement}', '{https://picsum.photos/seed/agbada-blouse/400/400}', false, NULL, NULL, false, NULL),
  (trovea.seed_uuid('product-019'), trovea.seed_uuid('merchant-001'), NULL, 'Kente-trim Trench Coat', 78000, 'item', 1, 'live', '{kente,trench,coat,luxury}', '{https://picsum.photos/seed/kente-trench/400/400}', false, NULL, NULL, false, NULL);

-- Tobi's Products (Menu Items)
INSERT INTO trovea.products (id, merchant_id, name, price, product_type, status, tags, images)
VALUES
  (trovea.seed_uuid('menu-001'), trovea.seed_uuid('merchant-002'), 'Jollof Rice (Full Pot)', 8500, 'menu_item', 'live', '{jollof,rice,main}', '{https://picsum.photos/seed/jollof-rice/400/400}'),
  (trovea.seed_uuid('menu-002'), trovea.seed_uuid('merchant-002'), 'Peppered Snail', 4500, 'menu_item', 'live', '{snail,pepper,protein}', '{https://picsum.photos/seed/peppered-snail/400/400}');

-- Chisom's Products (Services)
INSERT INTO trovea.products (id, merchant_id, name, price, product_type, status, tags, images, duration, deposit_amount, deposit_required)
VALUES
  (trovea.seed_uuid('svc-001'), trovea.seed_uuid('merchant-003'), 'Classic Lash Set', 25000, 'service', 'live', '{lashes,classic,natural}', '{https://picsum.photos/seed/classic-lash/400/400}', 90, 5000, true),
  (trovea.seed_uuid('svc-002'), trovea.seed_uuid('merchant-003'), 'Volume Lash Set', 35000, 'service', 'live', '{lashes,volume,dramatic}', '{https://picsum.photos/seed/volume-lash/400/400}', 120, 7000, true);

-- Femi's Products (Digital)
INSERT INTO trovea.products (id, merchant_id, name, price, product_type, status, tags, images, early_access_price, early_access_cap)
VALUES
  (trovea.seed_uuid('dig-001'), trovea.seed_uuid('merchant-004'), 'Brand Starter Kit', 12000, 'digital', 'live', '{brand,starter,kit,design}', '{https://picsum.photos/seed/brand-starter/400/400}', 8000, 30);

-- Ngozi's Products (Packages)
INSERT INTO trovea.products (id, merchant_id, name, price, product_type, status, tags, images, price_type, scope_description, deliverables, timeline_estimate, deposit_pct)
VALUES
  (trovea.seed_uuid('pkg-001'), trovea.seed_uuid('merchant-005'), 'Brand Shoot Starter', 120000, 'package', 'live', '{brand,shoot,starter,photography}', '{https://picsum.photos/seed/brand-shoot/400/400}', 'fixed', 'Half-day studio or location shoot covering up to 3 looks. Ideal for new brands establishing their visual identity.', '20 retouched images, 3 short reels', '3–5 business days', 50);

-- ─── 6. RECEIPTS ──────────────────────────────────────────────────────────
INSERT INTO trovea.receipts (id, merchant_id, seal_id, receipt_type, buyer_name, buyer_phone, line_items, subtotal, total, payment_status, payment_method, shipment_status, created_at)
VALUES
  (trovea.seed_uuid('receipt-001'), trovea.seed_uuid('merchant-001'), 'TRV-0001-9F3A', 'sale', 'Adaeze Okonkwo', '+2348031122334', '[{"product_id":"product-002","name":"Vintage Linen Midi Dress","variant_label":null,"quantity":1,"unit_price":18500,"total_price":18500}]'::jsonb, 18500, 18500, 'paid', 'bank_transfer', 'shipped', NOW() - INTERVAL '14 days');

-- ─── 7. CLAIMS ────────────────────────────────────────────────────────────
INSERT INTO trovea.claims (id, product_id, merchant_id, buyer_name, buyer_phone, status, expires_at, created_at)
VALUES
  (trovea.seed_uuid('claim-001'), trovea.seed_uuid('product-007'), trovea.seed_uuid('merchant-001'), 'Adaeze Okonkwo', '+2348031122334', 'pending', NOW() + INTERVAL '21 hours', NOW() - INTERVAL '3 hours');

-- ─── 8. HOLDS ─────────────────────────────────────────────────────────────
INSERT INTO trovea.holds (id, product_id, merchant_id, buyer_name, buyer_phone, status, duration_hours, expires_at, created_at)
VALUES
  (trovea.seed_uuid('hold-001'), trovea.seed_uuid('product-019'), trovea.seed_uuid('merchant-001'), 'Adaeze Okonkwo', '+2348031122334', 'active', 24, NOW() + INTERVAL '22 hours', NOW() - INTERVAL '2 hours');

-- ─── 9. DROPS ─────────────────────────────────────────────────────────────
INSERT INTO trovea.drops (id, merchant_id, label, scheduled_at, status, product_ids)
VALUES
  (trovea.seed_uuid('drop-001'), trovea.seed_uuid('merchant-001'), 'Drop 03 — Ankara Revival', NOW() - INTERVAL '14 days', 'completed', ARRAY[trovea.seed_uuid('product-001'), trovea.seed_uuid('product-003'), trovea.seed_uuid('product-007')]);

-- ─── 10. AVAILABILITY WINDOWS ──────────────────────────────────────────────
INSERT INTO trovea.availability_windows (id, merchant_id, label, opens_at, closes_at, status, total_orders)
VALUES
  (trovea.seed_uuid('window-001'), trovea.seed_uuid('merchant-002'), 'Weekend Drop — This Saturday', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', 'open', 14);

-- ─── 11. BOOKINGS ─────────────────────────────────────────────────────────
INSERT INTO trovea.bookings (id, merchant_id, service_id, service_name, buyer_name, buyer_phone, scheduled_at, duration_minutes, deposit_paid, total_amount, status)
VALUES
  (trovea.seed_uuid('booking-001'), trovea.seed_uuid('merchant-003'), trovea.seed_uuid('svc-001'), 'Classic Lash Set', 'Adaeze Okonkwo', '+2348031122334', NOW() + INTERVAL '1 day', 90, 5000, 25000, 'confirmed');

-- ─── 12. ENQUIRIES ────────────────────────────────────────────────────────
INSERT INTO trovea.enquiries (id, merchant_id, client_name, company, project_type, budget_range, timeline, message, package_id, status)
VALUES
  (trovea.seed_uuid('enquiry-001'), trovea.seed_uuid('merchant-005'), 'Amara Obi', 'Amara Beauty', 'Brand Photography', '₦200k–₦500k', 'Within 1 month', 'Hi, I need professional photos for my skincare brand launch.', 'pkg-001', 'new');

-- ─── 13. STORE REPORTS ────────────────────────────────────────────────────
INSERT INTO trovea.store_reports (id, reported_merchant_id, reported_store_name, category, detail, status, priority)
VALUES
  (trovea.seed_uuid('report-001'), trovea.seed_uuid('merchant-001'), 'Tola''s Archive', 'misleading', 'Item described as vintage but looks new.', 'pending', 'medium');

-- ─── 14. ADMIN LOG ────────────────────────────────────────────────────────
INSERT INTO trovea.admin_log (id, admin_id, action, target_merchant_id, note)
VALUES
  (gen_random_uuid(), trovea.seed_uuid('user-999'), 'Verification tier upgraded', trovea.seed_uuid('merchant-003'), 'Upgraded Chisom Beauty to Trusted based on 90-day review.');

COMMIT;

-- Clean up helper
DROP FUNCTION trovea.seed_uuid(TEXT);
