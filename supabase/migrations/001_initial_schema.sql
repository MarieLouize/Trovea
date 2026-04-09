-- Trovéa Initial Schema
-- Generated: 2026-04-05

CREATE SCHEMA IF NOT EXISTS trovea;

-- ─── SHARED FUNCTIONS ───────────────────────────────────────────────────────

-- Reusable updated_at trigger function
CREATE OR REPLACE FUNCTION trovea.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. PROFILES ──────────────────────────────────────────────────────────

CREATE TABLE trovea.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  whatsapp TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('curator', 'buyer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON trovea.profiles
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- Trigger to create profile on auth signup
CREATE OR REPLACE FUNCTION trovea.on_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trovea.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'buyer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trovea.on_auth_user_created();

-- ─── 2. MERCHANTS ─────────────────────────────────────────────────────────

CREATE TABLE trovea.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES trovea.profiles(id),
  display_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_-]+$'),
  store_type TEXT NOT NULL CHECK (store_type IN ('collector', 'vendor', 'host', 'digital_creator', 'studio')),
  whatsapp TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  social_links JSONB NOT NULL DEFAULT '{"instagram":null,"twitter":null,"tiktok":null}'::jsonb,
  portfolio_images TEXT[] NOT NULL DEFAULT '{}',
  arrival_notes TEXT,
  response_time_hours SMALLINT,
  store_open BOOLEAN NOT NULL DEFAULT true,
  whatsapp_template TEXT,
  store_config JSONB NOT NULL,
  verification_tier TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_tier IN ('unverified', 'verified', 'trusted')),
  is_paused BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  pause_message TEXT,
  pause_return_date DATE,
  checkout_enabled BOOLEAN NOT NULL DEFAULT false,
  holds_enabled BOOLEAN NOT NULL DEFAULT false,
  hold_duration_hours SMALLINT NOT NULL DEFAULT 24 CHECK (hold_duration_hours IN (2, 6, 12, 24)),
  bank_account JSONB,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER merchants_set_updated_at
  BEFORE UPDATE ON trovea.merchants
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- ─── 3. COLLECTIONS ───────────────────────────────────────────────────────

CREATE TABLE trovea.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_accent TEXT NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 0,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_id, slug)
);

CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON trovea.collections
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- ─── 4. PRODUCTS ──────────────────────────────────────────────────────────

CREATE TABLE trovea.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  collection_id UUID REFERENCES trovea.collections(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  product_type TEXT NOT NULL CHECK (product_type IN ('item', 'service', 'digital', 'package', 'menu_item')),
  stock_level INTEGER,
  status TEXT NOT NULL DEFAULT 'hidden' CHECK (status IN ('live', 'hidden', 'sold_out')),
  category TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  images TEXT[] NOT NULL DEFAULT '{}',
  has_variants BOOLEAN NOT NULL DEFAULT false,
  variant_axis TEXT,
  variants JSONB,
  claim_mode BOOLEAN NOT NULL DEFAULT false,
  claim_limit SMALLINT,
  duration SMALLINT,
  deposit_amount INTEGER,
  deposit_required BOOLEAN NOT NULL DEFAULT false,
  delivery_url TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  early_access_price INTEGER,
  early_access_cap INTEGER,
  price_type TEXT CHECK (price_type IN ('fixed', 'custom')),
  scope_description TEXT,
  deliverables TEXT,
  timeline_estimate TEXT,
  deposit_pct SMALLINT CHECK (deposit_pct BETWEEN 0 AND 100),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON trovea.products
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- ─── 5. RECEIPTS ──────────────────────────────────────────────────────────

CREATE TABLE trovea.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  seal_id TEXT NOT NULL UNIQUE,
  receipt_type TEXT NOT NULL CHECK (receipt_type IN ('sale', 'booking', 'order', 'download', 'project')),
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_email TEXT,
  line_items JSONB NOT NULL,
  subtotal INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('flat', 'percent')),
  discount JSONB,
  delivery_fee INTEGER,
  total INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (payment_status IN ('pending_payment', 'paid', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'cash', 'opay', 'palmpay', 'moniepoint', 'ussd', 'other')),
  shipment_status TEXT NOT NULL DEFAULT 'not_started' CHECK (shipment_status IN ('not_started', 'packed', 'shipped', 'received')),
  fulfilment_type TEXT CHECK (fulfilment_type IN ('pickup', 'delivery')),
  order_type TEXT CHECK (order_type IN ('preorder', 'walkin')),
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'failed', 'manual_pending')),
  notes TEXT,
  sale_note TEXT,
  log JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_quick_item BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trovea.receipts IS 'APPEND-ONLY: No DELETE permitted on this table';

CREATE TRIGGER receipts_set_updated_at
  BEFORE UPDATE ON trovea.receipts
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- Freeze columns trigger for receipts
CREATE OR REPLACE FUNCTION trovea.receipts_freeze_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.id != NEW.id OR
      OLD.merchant_id != NEW.merchant_id OR
      OLD.seal_id != NEW.seal_id OR
      OLD.receipt_type != NEW.receipt_type OR
      OLD.buyer_name != NEW.buyer_name OR
      OLD.buyer_phone IS DISTINCT FROM NEW.buyer_phone OR
      OLD.buyer_email IS DISTINCT FROM NEW.buyer_email OR
      OLD.line_items != NEW.line_items OR
      OLD.subtotal != NEW.subtotal OR
      OLD.discount_amount != NEW.discount_amount OR
      OLD.discount_type IS DISTINCT FROM NEW.discount_type OR
      OLD.discount IS DISTINCT FROM NEW.discount OR
      OLD.delivery_fee IS DISTINCT FROM NEW.delivery_fee OR
      OLD.total != NEW.total OR
      OLD.notes IS DISTINCT FROM NEW.notes OR
      OLD.sale_note IS DISTINCT FROM NEW.sale_note OR
      OLD.fulfilment_type IS DISTINCT FROM NEW.fulfilment_type OR
      OLD.order_type IS DISTINCT FROM NEW.order_type OR
      OLD.is_quick_item != NEW.is_quick_item OR
      OLD.created_at != NEW.created_at) THEN
    RAISE EXCEPTION 'Cannot modify frozen receipt columns';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_receipts_freeze_columns
  BEFORE UPDATE ON trovea.receipts
  FOR EACH ROW EXECUTE FUNCTION trovea.receipts_freeze_columns();

-- ─── 6. CLAIMS ────────────────────────────────────────────────────────────

CREATE TABLE trovea.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES trovea.products(id),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_email TEXT,
  buyer_note TEXT,
  proof_submitted BOOLEAN NOT NULL DEFAULT false,
  proof_note TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER claims_set_updated_at
  BEFORE UPDATE ON trovea.claims
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- Claim expiry trigger
CREATE OR REPLACE FUNCTION trovea.set_claim_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NOW() + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_claim_expiry
  BEFORE INSERT ON trovea.claims
  FOR EACH ROW EXECUTE FUNCTION trovea.set_claim_expiry();

CREATE UNIQUE INDEX idx_claims_pending_product ON trovea.claims (product_id) WHERE status = 'pending';

-- ─── 7. HOLDS ─────────────────────────────────────────────────────────────

CREATE TABLE trovea.holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES trovea.products(id),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'released')),
  duration_hours SMALLINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hold expiry trigger
CREATE OR REPLACE FUNCTION trovea.set_hold_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = NOW() + (NEW.duration_hours || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_set_hold_expiry
  BEFORE INSERT ON trovea.holds
  FOR EACH ROW EXECUTE FUNCTION trovea.set_hold_expiry();

-- ─── 8. DROPS ─────────────────────────────────────────────────────────────

CREATE TABLE trovea.drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  label TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'completed')),
  product_ids UUID[] NOT NULL DEFAULT '{}',
  notify_emails TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER drops_set_updated_at
  BEFORE UPDATE ON trovea.drops
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- ─── 9. AVAILABILITY WINDOWS ──────────────────────────────────────────────

CREATE TABLE trovea.availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  label TEXT NOT NULL,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'open', 'closed')),
  total_orders INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER availability_windows_set_updated_at
  BEFORE UPDATE ON trovea.availability_windows
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- ─── 10. BOOKINGS ─────────────────────────────────────────────────────────

CREATE TABLE trovea.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  service_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes SMALLINT NOT NULL,
  deposit_paid INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 11. ENQUIRIES ────────────────────────────────────────────────────────

CREATE TABLE trovea.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  client_name TEXT NOT NULL,
  company TEXT,
  project_type TEXT NOT NULL,
  budget_range TEXT NOT NULL,
  timeline TEXT NOT NULL,
  message TEXT NOT NULL,
  package_id TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_discussion', 'active_project', 'completed', 'declined')),
  response_time_hours SMALLINT,
  package_value INTEGER,
  deposit_paid INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER enquiries_set_updated_at
  BEFORE UPDATE ON trovea.enquiries
  FOR EACH ROW EXECUTE FUNCTION trovea.set_updated_at();

-- ─── 12. STORE REPORTS ────────────────────────────────────────────────────

CREATE TABLE trovea.store_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_merchant_id UUID NOT NULL REFERENCES trovea.merchants(id),
  reported_store_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('counterfeit', 'misleading', 'suspicious_payment', 'unresponsive', 'inappropriate', 'other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ─── 13. ADMIN LOG ────────────────────────────────────────────────────────

CREATE TABLE trovea.admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES trovea.profiles(id),
  action TEXT NOT NULL,
  target_merchant_id UUID REFERENCES trovea.merchants(id),
  target_receipt_id UUID REFERENCES trovea.receipts(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin log immutability trigger
CREATE OR REPLACE FUNCTION trovea.admin_log_immutability()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_admin_log_immutability
  BEFORE UPDATE OR DELETE ON trovea.admin_log
  FOR EACH ROW EXECUTE FUNCTION trovea.admin_log_immutability();

-- ─── INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX idx_merchants_handle ON trovea.merchants (handle);
CREATE INDEX idx_merchants_owner_id ON trovea.merchants (owner_id);
CREATE INDEX idx_merchants_deleted_at ON trovea.merchants (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_collections_merchant_id ON trovea.collections (merchant_id);

CREATE INDEX idx_products_merchant_id ON trovea.products (merchant_id);
CREATE INDEX idx_products_status ON trovea.products (status);
CREATE INDEX idx_products_deleted_at ON trovea.products (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_receipts_merchant_id ON trovea.receipts (merchant_id);
CREATE INDEX idx_receipts_seal_id ON trovea.receipts (seal_id);
CREATE INDEX idx_receipts_payment_status ON trovea.receipts (payment_status);

CREATE INDEX idx_claims_merchant_id ON trovea.claims (merchant_id);
CREATE INDEX idx_claims_status ON trovea.claims (status);
CREATE INDEX idx_claims_expires_at ON trovea.claims (expires_at);

CREATE INDEX idx_holds_merchant_id ON trovea.holds (merchant_id);
CREATE INDEX idx_holds_status_expires ON trovea.holds (status, expires_at);

CREATE INDEX idx_drops_merchant_id ON trovea.drops (merchant_id);
CREATE INDEX idx_drops_status_scheduled ON trovea.drops (status, scheduled_at);

CREATE INDEX idx_windows_merchant_id ON trovea.availability_windows (merchant_id);
CREATE INDEX idx_windows_status_dates ON trovea.availability_windows (status, opens_at, closes_at);

CREATE INDEX idx_bookings_merchant_id_scheduled ON trovea.bookings (merchant_id, scheduled_at);

CREATE INDEX idx_enquiries_merchant_id ON trovea.enquiries (merchant_id);
CREATE INDEX idx_enquiries_status ON trovea.enquiries (status);

CREATE INDEX idx_reports_merchant_id ON trovea.store_reports (reported_merchant_id);
CREATE INDEX idx_reports_status ON trovea.store_reports (status);

CREATE INDEX idx_admin_log_created_at ON trovea.admin_log (created_at);
