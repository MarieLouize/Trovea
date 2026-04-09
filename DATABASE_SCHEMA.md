# Trovéa — Phase 3A Database Schema Design

**Status: DECISIONS RESOLVED — Ready for Phase 3B SQL generation.**
**Produced: 2026-04-05**
**Decisions resolved: 2026-04-05**
**Author: Claude Code (Phase 3A)**

---

## Design Principles Applied

1. **TypeScript types are ground truth.** Every field in the TypeScript interfaces has a home below — either as a DB column or explicitly marked "client-derived".
2. **Named schema.** All tables live in the `trovea` schema. Auth stays in `auth`. No `public` table pollution.
3. **Soft deletes on critical tables.** `merchants` and `products` have `deleted_at`. Receipts use a stronger guarantee (no DELETE grant at all).
4. **JSONB for flexible per-type config.** `store_config` (including nested `store_type_config`), `social_links`, `bank_account`, `line_items`, `log`, `discount` are all JSONB. TypeScript validates shape at the client layer.
5. **RLS over everything.** Default: DENY ALL. Policies are additive.

---

## Deviations from Phase 3A Prompt (Read These)

The following deviations were discovered by reading the actual TypeScript source. Phase 3B must account for them:

| Deviation | Reason |
|---|---|
| `Receipt` has 4 extra fields beyond ARCHITECTURE.md: `discount_type`, `sale_note`, `fulfilment_type`, `order_type`, `delivery_status` | Added in Phase 2.5-F (terminal.store.ts, receipt.types.ts). All must be columns. |
| `Merchant` has 3 extra fields: `arrival_notes`, `response_time_hours`, `portfolio_images` | Present in merchant.types.ts. Must be columns. |
| `StoreTypeConfig` has 7 extra fields vs ARCHITECTURE.md | `preview_state`, `dormant_message`, `dormant_image_url`, `price_prominence`, `currency_display`, `portfolio_order`, `client_logos_enabled`. All live inside JSONB `store_config` — no column change needed, just document them. |
| `store_reports` table not in Phase 3A prompt | `StoreReport` interface exists in `merchant.types.ts` with a full fixture. Added as `trovea.store_reports`. |
| `admin_log.actor` is `'admin'` string literal in TypeScript, not a UUID | DB schema adds `admin_id UUID REFERENCES trovea.profiles(id)` for accountability. Phase 3B must update the TypeScript `AdminLogEntry` type to include `admin_id`. |
| `profiles.role` must include `'admin'` | `merchant.types.ts` declares `MerchantRole = 'curator' | 'buyer'` but the Admin Panel and INVARIANTS.md both confirm admin role exists. Phase 3A prompt already specifies this correctly. |
| `merchants.is_suspended` not in TypeScript `Merchant` interface | The admin store (`admin.store.ts`) tracks `suspendedMerchantIds[]`. This state must persist in the DB as a column. Phase 3B adds `is_suspended BOOLEAN DEFAULT FALSE` to merchants and must update the TypeScript interface. |
| `delivery_fee` unit ambiguity | **Resolved:** Store as INTEGER (naira), consistent with all other monetary fields. INVARIANTS.md contains an error on this point — it must be corrected in Phase 3B. All monetary values in `trovea` are naira integers. |
| `HoldRequest` (TypeScript) vs `holds` table name in prompt | Naming: the table is `trovea.holds`. The TypeScript interface is `HoldRequest`. Consistent. |
| `ClaimRequest` lives in `store-config.types.ts`, not `receipt.types.ts` | No schema impact — just noting the location for Phase 3B. |

---

## Table Definitions

---

### `trovea.profiles`

Extends `auth.users`. One row per registered user. Created automatically on auth signup via trigger.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, REFERENCES `auth.users(id)` ON DELETE CASCADE | Same UUID as auth user |
| `display_name` | `TEXT` | NOT NULL | Set during onboarding/identity step |
| `whatsapp` | `TEXT` | NULL | `+234XXXXXXXXXX` format |
| `role` | `TEXT` | NOT NULL, DEFAULT `'buyer'`, CHECK IN (`'curator'`, `'buyer'`, `'admin'`) | Role is permanent in v1 — see INVARIANTS |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Updated via trigger |

**RLS Policies:**
- **SELECT**: User can read their own profile (`id = auth.uid()`). Admins can read all profiles.
- **INSERT**: Disallowed via RLS — profile is created by a `SECURITY DEFINER` trigger on `auth.users` INSERT.
- **UPDATE**: User can update only their own profile (`id = auth.uid()`). Restricted columns: `role` cannot be changed by the user (only by admin via service role). Admins can UPDATE any profile.
- **DELETE**: Nobody. Role assignment is permanent in v1.

**Triggers:**
- `on_auth_user_created` — `AFTER INSERT ON auth.users` → inserts into `trovea.profiles` with `role = 'buyer'`. Runs as `SECURITY DEFINER`.
- `set_updated_at` — `BEFORE UPDATE` → sets `updated_at = now()`. Applied to all tables that have `updated_at`.

**Indexes:**
- PK index on `id` (automatic).

---

### `trovea.merchants`

One merchant per curator. In v1, `owner_id` is unique (one store per user). The full `store_config` object (including nested `store_type_config`) is stored as a single JSONB column — it is always read and written atomically (the Architect "Publish" ceremony writes all layers at once, per INVARIANTS.md).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `owner_id` | `UUID` | NOT NULL, UNIQUE, REFERENCES `trovea.profiles(id)` | UNIQUE enforces one store per curator in v1 |
| `display_name` | `TEXT` | NOT NULL | Curator's display name (mirrors profile) |
| `store_name` | `TEXT` | NOT NULL | e.g. "Tola's Archive" |
| `handle` | `TEXT` | NOT NULL, UNIQUE, CHECK (`handle ~ '^[a-z0-9_-]+$'`) | Locked after init — see INVARIANTS. Lowercase alphanumeric, underscores, hyphens only. Phase 3B must mirror this regex in `SetupStorePage` onboarding validation (lowercasing on input, stripping invalid chars before submit). |
| `store_type` | `TEXT` | NOT NULL, CHECK IN (`'collector'`, `'vendor'`, `'host'`, `'digital_creator'`, `'studio'`) | Locked after init — see INVARIANTS |
| `whatsapp` | `TEXT` | NOT NULL | `+234XXXXXXXXXX` format |
| `bio` | `TEXT` | NOT NULL, DEFAULT `''` | |
| `avatar_url` | `TEXT` | NULL | URL in `merchant-avatars` bucket |
| `social_links` | `JSONB` | NOT NULL, DEFAULT `'{"instagram":null,"twitter":null,"tiktok":null}'` | Shape: `{instagram, twitter, tiktok}` all nullable strings |
| `portfolio_images` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | Array of URLs in `portfolio-images` bucket |
| `arrival_notes` | `TEXT` | NULL | Vendor/Host field: directions, pickup info |
| `response_time_hours` | `SMALLINT` | NULL | Studio field: typical response time in hours |
| `store_open` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Daily open/closed toggle |
| `whatsapp_template` | `TEXT` | NULL | Custom WhatsApp message template |
| `store_config` | `JSONB` | NOT NULL | Full `StoreConfig` including nested `store_type_config`. Validated at client layer. |
| `verification_tier` | `TEXT` | NOT NULL, DEFAULT `'unverified'`, CHECK IN (`'unverified'`, `'verified'`, `'trusted'`) | Set by admin only |
| `is_paused` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Store pause (vs daily store_open toggle) |
| `is_suspended` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Admin-only action — not in current TypeScript `Merchant` interface; Phase 3B must add it |
| `pause_message` | `TEXT` | NULL | Shown to buyers during pause |
| `pause_return_date` | `DATE` | NULL | Estimated return date — stored as DATE not TIMESTAMPTZ (day precision only) |
| `checkout_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Trovéa Checkout (Claim System) toggle |
| `holds_enabled` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Hold System toggle |
| `hold_duration_hours` | `SMALLINT` | NOT NULL, DEFAULT `24`, CHECK IN (`2`, `6`, `12`, `24`) | |
| `bank_account` | `JSONB` | NULL | Shape: `{account_number, bank_name, account_name}`. Trovéa does not verify with any bank API — see INVARIANTS. |
| `initialized_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Set once at store creation |
| `last_active_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Updated on any meaningful action |
| `deleted_at` | `TIMESTAMPTZ` | NULL, DEFAULT `NULL` | Soft delete — never hard-deleted |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- `handle`: CHECK constraint `handle ~ '^[a-z0-9_-]+$'` is applied at the DB level. Phase 3B must also enforce this in `SetupStorePage` — strip spaces, lowercase the input, and reject characters outside `[a-z0-9_-]` before the form submits.
- `store_config` JSONB includes `store_type_config` nested within it. The TypeScript `StoreConfig.store_type_config` is a single blob with fields for all 5 store types (most fields null for non-applicable types). This union-style blob is intentional — it avoids 5 separate config tables and maps 1:1 with the TypeScript type.
- `pause_return_date`: The TypeScript type is `string | null` (ISO date string). DB stores as `DATE` — no time component needed, simpler constraint.
- `social_links`, `bank_account`: JSONB with documented shape. TypeScript interface enforces shape at the client layer.
- Soft delete: queries against this table should filter `WHERE deleted_at IS NULL` in all RLS policies and application code.

**RLS Policies:**
- **SELECT**: Curator can read their own merchant (`owner_id = auth.uid()`). Public (unauthenticated) can read non-deleted, non-suspended merchants: `(deleted_at IS NULL AND is_suspended = false)` — restricted to columns safe for public: `id`, `store_name`, `handle`, `store_type`, `bio`, `avatar_url`, `social_links`, `store_open`, `store_config`, `verification_tier`, `is_paused`, `pause_message`, `pause_return_date`, `arrival_notes`, `whatsapp`, `portfolio_images`. Sensitive columns (`bank_account`, `whatsapp_template`, `checkout_enabled`, `holds_enabled`, `hold_duration_hours`) are read-only for the owning curator. Admins can read all merchants including deleted/suspended.
- **INSERT**: Only authenticated users with `role = 'curator'` in profiles can insert, and only one row (`owner_id = auth.uid()`). Enforced by UNIQUE constraint on `owner_id` + RLS CHECK.
- **UPDATE**: Curator can update their own merchant only (`owner_id = auth.uid()`). Exception: `handle`, `store_type`, `owner_id`, `initialized_at`, `verification_tier`, `is_suspended` are immutable via application-layer guard — they cannot be updated by curator RLS (only service role or admin). `deleted_at` cannot be set by curator.
- **DELETE**: Nobody. Soft delete only via UPDATE `deleted_at`.

**Indexes:**
- `handle` — UNIQUE index (already enforced by constraint).
- `owner_id` — UNIQUE index.
- `store_type` — for admin filtering.
- `deleted_at` — partial index on `WHERE deleted_at IS NULL`.

---

### `trovea.collections`

Groupings of products within a merchant's archive.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` ON DELETE CASCADE | Cascade: if merchant soft-deletes, collections become unreachable via RLS anyway. Hard cascade for FK integrity. |
| `name` | `TEXT` | NOT NULL | |
| `color_accent` | `TEXT` | NOT NULL | CSS colour value, e.g. `#C9A84C` |
| `display_order` | `SMALLINT` | NOT NULL, DEFAULT `0` | Ordering within the merchant's archive |
| `slug` | `TEXT` | NOT NULL | URL slug, e.g. `dresses` |
| `description` | `TEXT` | NULL | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Constraints:**
- UNIQUE `(merchant_id, slug)` — slug must be unique per merchant, not globally.

**RLS Policies:**
- **SELECT**: Curator can read all collections for their own merchant. Public can read collections for any non-deleted, non-suspended merchant.
- **INSERT**: Curator can insert collections for their own merchant only.
- **UPDATE**: Curator can update their own merchant's collections.
- **DELETE**: Curator can delete their own collections. Hard delete permitted — collections are not transactional records. (Products with this `collection_id` will have `collection_id` set to NULL via FK ON DELETE SET NULL — see products table.)

**Indexes:**
- `merchant_id` — for filtering by merchant.
- UNIQUE `(merchant_id, slug)`.

---

### `trovea.products`

All items, services, digital products, packages, and menu items. Never hard-deleted — status changes only.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Stable forever — see INVARIANTS |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `collection_id` | `UUID` | NULL, REFERENCES `trovea.collections(id)` ON DELETE SET NULL | |
| `name` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | NULL | |
| `price` | `INTEGER` | NOT NULL, DEFAULT `0` | **Naira integers — NOT kobo.** Matches INVARIANTS.md and all TypeScript usage. |
| `product_type` | `TEXT` | NOT NULL, CHECK IN (`'item'`, `'service'`, `'digital'`, `'package'`, `'menu_item'`) | |
| `stock_level` | `INTEGER` | NULL | NULL when `has_variants = true` — stock lives on variants only. See INVARIANTS. |
| `status` | `TEXT` | NOT NULL, DEFAULT `'hidden'`, CHECK IN (`'live'`, `'hidden'`, `'sold_out'`) | Products start hidden — must be explicitly published |
| `category` | `TEXT` | NULL | Free-text category |
| `tags` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | |
| `images` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | URLs in `product-images` bucket |
| `has_variants` | `BOOLEAN` | NOT NULL, DEFAULT `false` | |
| `variant_axis` | `TEXT` | NULL | e.g. `"Size"`, `"Colour"`. Present when `has_variants = true`. |
| `variants` | `JSONB` | NULL | Array of `ProductVariant` objects. NULL when `has_variants = false`. Shape validated at client. |
| `claim_mode` | `BOOLEAN` | NOT NULL, DEFAULT `false` | |
| `claim_limit` | `SMALLINT` | NULL | Max simultaneous pending claims. NULL = no limit. |
| `duration` | `SMALLINT` | NULL | Host/Studio: session duration in minutes |
| `deposit_amount` | `INTEGER` | NULL | Host/Studio: deposit amount in naira |
| `deposit_required` | `BOOLEAN` | NOT NULL, DEFAULT `false` | |
| `delivery_url` | `TEXT` | NULL | Digital Creator: download/access URL. Treated as private; signed URL issued post-payment. |
| `is_free` | `BOOLEAN` | NOT NULL, DEFAULT `false` | Digital Creator: free download flag |
| `early_access_price` | `INTEGER` | NULL | Digital Creator: early-bird price in naira |
| `early_access_cap` | `INTEGER` | NULL | Digital Creator: early-access seat cap |
| `price_type` | `TEXT` | NULL, CHECK IN (`'fixed'`, `'custom'`) | Studio packages only |
| `scope_description` | `TEXT` | NULL | Studio: what the package includes |
| `deliverables` | `TEXT` | NULL | Studio: list of deliverables |
| `timeline_estimate` | `TEXT` | NULL | Studio: e.g. "2–4 weeks" |
| `deposit_pct` | `SMALLINT` | NULL, CHECK (deposit_pct BETWEEN 0 AND 100) | Studio: deposit as percentage |
| `deleted_at` | `TIMESTAMPTZ` | NULL, DEFAULT `NULL` | Soft delete. ID remains stable forever. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- `variants` JSONB stores an array of `{id, label, price_override, stock_level, status, display_order}`. These are not normalised into a separate table because variant sets are always read/written as a complete array (no partial variant updates — the whole product is patched at once).
- `status = 'hidden'` as default ensures new products are never accidentally live.
- All monetary fields (price, deposit_amount, early_access_price) are in naira integers, consistent with INVARIANTS.md. The `delivery_url` for digital products is stored as a plain URL but access is controlled via signed URLs at the API layer.

**RLS Policies:**
- **SELECT**: Curator can read all their own merchant's products (including hidden and soft-deleted). Public can read only `status = 'live'` products for non-deleted, non-suspended merchants (`deleted_at IS NULL`). Admins can read all.
- **INSERT**: Curator can insert products for their own merchant only.
- **UPDATE**: Curator can update their own merchant's products. Cannot change `id`, `merchant_id`, or `created_at`. Soft deletes via UPDATE `deleted_at`.
- **DELETE**: Nobody. Soft delete only. Enforced by: no DELETE policy granted to any role.

**Indexes:**
- `merchant_id` — for archive page queries.
- `status` — for public storefront filtering.
- `collection_id` — for collection page queries.
- `(merchant_id, status)` — composite for curator archive + public queries.
- `deleted_at` — partial index on `WHERE deleted_at IS NULL`.

---

### `trovea.receipts`

The most critical table. Represents issued Seals. Append-only. No mutations except status field updates. No DELETE for any role.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `seal_id` | `TEXT` | NOT NULL, UNIQUE | Human-readable ID, e.g. `TRV-0001-9F3A`. Generated at issuance. |
| `receipt_type` | `TEXT` | NOT NULL, CHECK IN (`'sale'`, `'booking'`, `'order'`, `'download'`, `'project'`) | |
| `buyer_name` | `TEXT` | NOT NULL | |
| `buyer_phone` | `TEXT` | NULL | `+234XXXXXXXXXX` format — see Privacy Rules in INVARIANTS |
| `buyer_email` | `TEXT` | NULL | Used for digital delivery |
| `line_items` | `JSONB` | NOT NULL | Array of `ReceiptLineItem` objects. Schema: `[{product_id, name, variant_label, quantity, unit_price, total_price}]`. All monetary values in naira. |
| `subtotal` | `INTEGER` | NOT NULL | Naira. Sum of line_items totals. Stored for query performance. |
| `discount_amount` | `INTEGER` | NOT NULL, DEFAULT `0` | Naira. Redundant with `discount.applied_amount` — kept as a denormalised fast-access column. |
| `discount_type` | `TEXT` | NULL, CHECK IN (`'flat'`, `'percent'`) | Redundant with `discount.type` — kept for fast filtering without JSONB parsing. |
| `discount` | `JSONB` | NULL | Full discount object: `{type, value, applied_amount}`. NULL if no discount applied. |
| `delivery_fee` | `INTEGER` | NULL | **Naira integers.** INVARIANTS.md incorrectly stated "kobo" — overridden here. Consistent with all other monetary fields. Phase 3B must correct INVARIANTS.md. |
| `total` | `INTEGER` | NOT NULL | Naira. Server revalidates this on write — client total is display only. |
| `payment_status` | `TEXT` | NOT NULL, DEFAULT `'pending_payment'`, CHECK IN (`'pending_payment'`, `'paid'`, `'cancelled'`) | |
| `payment_method` | `TEXT` | NULL, CHECK IN (`'bank_transfer'`, `'cash'`, `'opay'`, `'palmpay'`, `'moniepoint'`, `'ussd'`, `'other'`) | NULL until payment confirmed |
| `shipment_status` | `TEXT` | NOT NULL, DEFAULT `'not_started'`, CHECK IN (`'not_started'`, `'packed'`, `'shipped'`, `'received'`) | |
| `fulfilment_type` | `TEXT` | NULL, CHECK IN (`'pickup'`, `'delivery'`) | Set at Terminal Stage 2 for Vendor receipts |
| `order_type` | `TEXT` | NULL, CHECK IN (`'preorder'`, `'walkin'`) | Set at Terminal Stage 2 for Vendor receipts |
| `delivery_status` | `TEXT` | NULL, CHECK IN (`'pending'`, `'sent'`, `'failed'`, `'manual_pending'`) | For digital product email delivery |
| `notes` | `TEXT` | NULL | Curator's internal notes |
| `sale_note` | `TEXT` | NULL | Curator's sale note shown on receipt |
| `log` | `JSONB` | NOT NULL, DEFAULT `'[]'` | Array of `ReceiptLogEntry`: `[{id, event, timestamp, actor}]`. Append-only within the JSONB array — no entry ever removed. |
| `is_quick_item` | `BOOLEAN` | NOT NULL, DEFAULT `false` | True when receipt contains a quick/ad-hoc line item |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Updated on status changes only |

**The Append-Only Invariant — DB Enforcement:**

Per INVARIANTS.md: "No code path may UPDATE or DELETE a receipt record after issuance." This is enforced at the DB level via:

1. **No DELETE policy** — no role (including curator) is granted DELETE on this table.
2. **Column-level UPDATE restriction via RLS** — only `payment_status`, `payment_method`, `shipment_status`, `delivery_status`, `log`, `updated_at` may be updated. All other columns are frozen at issuance. Implemented via a `BEFORE UPDATE` trigger that raises an exception if any frozen column is modified.

**Frozen columns** (cannot change post-issuance): `id`, `merchant_id`, `seal_id`, `receipt_type`, `buyer_name`, `buyer_phone`, `buyer_email`, `line_items`, `subtotal`, `discount_amount`, `discount_type`, `discount`, `delivery_fee`, `total`, `notes`, `sale_note`, `fulfilment_type`, `order_type`, `is_quick_item`, `created_at`.

**Mutable columns** (status updates only): `payment_status`, `payment_method`, `shipment_status`, `delivery_status`, `log`, `updated_at`.

**RLS Policies:**
- **SELECT**: Curator can read all receipts for their own merchant (`merchant_id` matched via merchants.owner_id). Public can read a single receipt by `seal_id` — this is the public receipt/seal view at `/receipt/:receipt_id`. The buyer is unauthenticated; they access via the `seal_id` token. No other public read access.
- **INSERT**: Only authenticated curators can insert, for their own merchant only. Server-side total revalidation happens in the insert function (not RLS — handled in the DB function called by the API).
- **UPDATE**: Curator can update only the mutable columns (payment_status, payment_method, shipment_status, delivery_status, log, updated_at) for their own merchant's receipts. Frozen columns are protected by trigger. No UPDATE by public.
- **DELETE**: Nobody. Not even admins. See INVARIANTS.md: "Admin cannot modify or delete Seals — immutability applies to admins too."

**Triggers:**
- `receipts_freeze_columns` — `BEFORE UPDATE` → raises exception if any frozen column differs from OLD row.
- `receipts_set_updated_at` — `BEFORE UPDATE` → sets `updated_at = now()`.

**Indexes:**
- `merchant_id` — for ledger queries.
- `seal_id` — UNIQUE (already enforced by constraint), for public receipt lookup.
- `payment_status` — for ledger tab filtering.
- `(merchant_id, payment_status)` — composite for ledger pending tab.
- `(merchant_id, shipment_status)` — composite for dispatch tab.
- `created_at` — for ordering.

---

### `trovea.claims`

Claim requests submitted by buyers for claim-mode products. Auto-expire after 24 hours.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `product_id` | `UUID` | NOT NULL, REFERENCES `trovea.products(id)` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | Denormalised from product for faster RLS without join |
| `buyer_name` | `TEXT` | NOT NULL | |
| `buyer_phone` | `TEXT` | NOT NULL | |
| `buyer_email` | `TEXT` | NULL | |
| `buyer_note` | `TEXT` | NULL | |
| `proof_submitted` | `BOOLEAN` | NOT NULL, DEFAULT `false` | |
| `proof_note` | `TEXT` | NULL | Buyer's note when submitting proof |
| `status` | `TEXT` | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'accepted'`, `'declined'`, `'expired'`) | |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Set to `created_at + INTERVAL '24 hours'`. See INVARIANTS: "Claim auto-expires after 24 hours." |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Constraints:**
- Only one active pending claim per `(product_id)` at a time is enforced at the application layer (the INVARIANTS doc says "only one active claim per item/variant at a time"). A partial unique index can help: `UNIQUE (product_id) WHERE status = 'pending'`.

**Design Decisions:**
- Proof images for claims are stored in the `claim-proofs` storage bucket (see Storage Buckets section), not as a URL column here. The bucket is private; the upload URL is linked to the claim `id`. A separate `proof_url` column could be added in Phase 3B if needed.
- `expires_at` is set by the application at insert time (not a generated column — Postgres generated columns don't support dynamic computation based on `now()`). Phase 3B will set this in the insert function as `now() + INTERVAL '24 hours'`.

**RLS Policies:**
- **SELECT**: Curator can read all claims for their own merchant. Public (buyer) has no SELECT — claim status is communicated out-of-band (WhatsApp). Admins can read all.
- **INSERT**: Public (unauthenticated) can insert — buyers submit claims without logging in. No auth check on insert, but rate limiting and spam protection must be handled at the API/edge function layer.
- **UPDATE**: Curator can update `status` and `updated_at` for their own merchant's claims. Buyers cannot update — proof submission is handled via a separate API endpoint that appends to `proof_note` and flips `proof_submitted`. Admins can update all.
- **DELETE**: Nobody. Expired/declined claims stay for audit history.

**Indexes:**
- `merchant_id` — for curator claims list.
- `product_id` — for checking active claims per product.
- `status` — for filtering.
- `expires_at` — for automated expiry job.
- Partial unique: `(product_id) WHERE status = 'pending'`.

---

### `trovea.holds`

Time-limited reservations placed by buyers on products. Complementary to, but distinct from, claims.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `product_id` | `UUID` | NOT NULL, REFERENCES `trovea.products(id)` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | Denormalised for RLS without join |
| `buyer_name` | `TEXT` | NOT NULL | |
| `buyer_phone` | `TEXT` | NOT NULL | |
| `buyer_note` | `TEXT` | NULL | |
| `status` | `TEXT` | NOT NULL, DEFAULT `'active'`, CHECK IN (`'active'`, `'expired'`, `'released'`) | |
| `duration_hours` | `SMALLINT` | NOT NULL | Copy of `merchant.hold_duration_hours` at time of hold placement. Stored so the hold duration doesn't change retroactively if the merchant changes their setting. |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Set at insert: `now() + duration_hours * INTERVAL '1 hour'`. Set by insert function. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- `expires_at` is set in the insert function (not a generated column). A scheduled job or Edge Function will sweep expired holds and set `status = 'expired'`.
- No `updated_at` — holds are effectively immutable after creation (only `status` changes, via a narrowly-scoped UPDATE).
- No soft delete — holds naturally expire; their history is kept via `status`.

**RLS Policies:**
- **SELECT**: Curator can read all holds for their own merchant. Admins can read all. Public: no SELECT.
- **INSERT**: Public (unauthenticated) can insert — buyers place holds without logging in. Rate limiting at API layer.
- **UPDATE**: Curator can update `status` only (to `'released'`). System (service role) can update `status` to `'expired'` via scheduled job. No UPDATE by public.
- **DELETE**: Nobody.

**Indexes:**
- `merchant_id` — for curator holds view.
- `product_id` — for checking active holds.
- `(status, expires_at)` — for expiry sweep job.

---

### `trovea.drops`

Scheduled product drops for Collector merchants.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `label` | `TEXT` | NOT NULL | e.g. "Drop 04 — Summer Haul" |
| `scheduled_at` | `TIMESTAMPTZ` | NOT NULL | When the drop goes live |
| `status` | `TEXT` | NOT NULL, DEFAULT `'draft'`, CHECK IN (`'draft'`, `'scheduled'`, `'live'`, `'completed'`) | |
| `product_ids` | `UUID[]` | NOT NULL, DEFAULT `'{}'` | UUIDs referencing products. Not FK — array FKs in Postgres are unwieldy; referential integrity handled at app layer. |
| `notify_emails` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | Email list for drop notifications |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- `product_ids` is `UUID[]` rather than a junction table because drops are typically small (< 20 products) and always read/written as a complete list. A junction table would add complexity without benefit at this scale.
- Drop state (`'pre'` / `'live'` / `'post'` / `'none'`) is client-derived from `scheduled_at` vs `Date.now()` — not stored (see Client-Derived Values section).

**RLS Policies:**
- **SELECT**: Curator can read all their own drops. Public can read drops where `status IN ('scheduled', 'live')` for non-suspended merchants.
- **INSERT**: Curator can insert for their own merchant.
- **UPDATE**: Curator can update their own drops.
- **DELETE**: Curator can delete `draft` drops only. `scheduled`, `live`, `completed` drops cannot be deleted.

**Indexes:**
- `merchant_id` — for curator drops list.
- `(status, scheduled_at)` — for public drop queries.

---

### `trovea.availability_windows`

Vendor ordering windows. Buyers pre-order within an open window.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `label` | `TEXT` | NOT NULL | e.g. "Weekend Drop — This Saturday" |
| `opens_at` | `TIMESTAMPTZ` | NOT NULL | |
| `closes_at` | `TIMESTAMPTZ` | NOT NULL | |
| `status` | `TEXT` | NOT NULL, DEFAULT `'upcoming'`, CHECK IN (`'upcoming'`, `'open'`, `'closed'`) | |
| `total_orders` | `INTEGER` | NOT NULL, DEFAULT `0` | Denormalised count of confirmed orders in this window. Updated on receipt creation. |
| `notes` | `TEXT` | NULL | Menu notes, pickup info |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- Window state (`'open'` / `'closed'` / `'dormant'`) computed from `opens_at`, `closes_at`, `status` is client-derived — see Client-Derived Values. The `status` column stores the curator-set status; the runtime "is open right now?" check compares timestamps.
- `total_orders` is denormalised for display performance. The canonical count can always be derived from receipts but is expensive to re-query.

**RLS Policies:**
- **SELECT**: Curator reads all their own windows. Public reads all windows for non-suspended merchants.
- **INSERT / UPDATE**: Curator only, for their own merchant.
- **DELETE**: Curator can delete `upcoming` windows. `open` and `closed` windows cannot be deleted (they have order history).

**Indexes:**
- `merchant_id`.
- `(status, opens_at, closes_at)` — for open-window queries.

---

### `trovea.bookings`

Service bookings placed by buyers with Host/Studio merchants.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `service_id` | `UUID` | NOT NULL | References `products.id` (the booked service). Not a FK — service may be archived; ID must be stable. Soft FK enforced at app layer. |
| `service_name` | `TEXT` | NOT NULL | Denormalised at booking time — so the name is preserved even if the service is renamed |
| `buyer_name` | `TEXT` | NOT NULL | |
| `buyer_phone` | `TEXT` | NOT NULL | |
| `scheduled_at` | `TIMESTAMPTZ` | NOT NULL | |
| `duration_minutes` | `SMALLINT` | NOT NULL | |
| `deposit_paid` | `INTEGER` | NOT NULL, DEFAULT `0` | Naira |
| `total_amount` | `INTEGER` | NOT NULL | Naira |
| `status` | `TEXT` | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'confirmed'`, `'completed'`, `'cancelled'`) | |
| `notes` | `TEXT` | NULL | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- `service_id` uses `UUID` type but no FK constraint — product IDs are stable forever (INVARIANTS), but a formal FK would prevent soft-deleting the service while bookings reference it. The app layer validates the ID exists when creating a booking.
- `service_name` is denormalised to preserve the name at booking time.

**RLS Policies:**
- **SELECT**: Curator reads all bookings for their own merchant. Public: no SELECT (bookings contain buyer PII).
- **INSERT**: Public (unauthenticated) can insert — buyers book without logging in. Rate limiting at API layer.
- **UPDATE**: Curator can update `status` and `notes`. No UPDATE by public.
- **DELETE**: Nobody.

**Indexes:**
- `merchant_id`.
- `(merchant_id, scheduled_at)` — for schedule view ordering.
- `status`.

---

### `trovea.enquiries`

Project enquiries submitted to Studio merchants.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `client_name` | `TEXT` | NOT NULL | |
| `company` | `TEXT` | NULL | |
| `project_type` | `TEXT` | NOT NULL | Free text: "Brand Photography", "Corporate Headshots", etc. |
| `budget_range` | `TEXT` | NOT NULL | Free text: "₦200k–₦500k" |
| `timeline` | `TEXT` | NOT NULL | Free text: "Within 1 month" |
| `message` | `TEXT` | NOT NULL | |
| `package_id` | `TEXT` | NULL | References a product ID (package) — stored as TEXT for flexibility. Nullable (custom/no-package enquiries). Not a FK. |
| `status` | `TEXT` | NOT NULL, DEFAULT `'new'`, CHECK IN (`'new'`, `'in_discussion'`, `'active_project'`, `'completed'`, `'declined'`) | |
| `response_time_hours` | `SMALLINT` | NULL | Hours between enquiry creation and first curator response. Null until responded. |
| `package_value` | `INTEGER` | NULL | Naira. Agreed project value (set by curator when accepting) |
| `deposit_paid` | `INTEGER` | NULL | Naira. Deposit amount collected |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**Design Decisions:**
- `package_id` is `TEXT NOT FK` because it references `products.id` but may reference packages that were created before DB migration, or may be a free-text label. Type safety at app layer.
- Pipeline value and average response time are client-derived aggregates — not stored (see Client-Derived Values).

**RLS Policies:**
- **SELECT**: Curator reads all their own enquiries. Admins can read all. Public: no SELECT.
- **INSERT**: Public (unauthenticated) — buyers submit enquiry forms without logging in.
- **UPDATE**: Curator can update `status`, `response_time_hours`, `package_value`, `deposit_paid`, `updated_at`.
- **DELETE**: Nobody. Declined enquiries kept for history.

**Indexes:**
- `merchant_id`.
- `status` — for pipeline filtering.
- `created_at` — for ordering.

---

### `trovea.store_reports`

Buyer-submitted reports against merchants. Admin-reviewed.

*Note: This table was not in the Phase 3A prompt spec but exists in `merchant.types.ts` (`StoreReport` interface) and has a full fixture (`FIXTURE_REPORTS`). TypeScript is ground truth — included here.*

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `reported_merchant_id` | `UUID` | NOT NULL, REFERENCES `trovea.merchants(id)` | |
| `reported_store_name` | `TEXT` | NOT NULL | Denormalised — in case merchant is suspended/deleted |
| `category` | `TEXT` | NOT NULL, CHECK IN (`'counterfeit'`, `'misleading'`, `'suspicious_payment'`, `'unresponsive'`, `'inappropriate'`, `'other'`) | |
| `detail` | `TEXT` | NULL | Free-text from reporter |
| `status` | `TEXT` | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'reviewed'`, `'dismissed'`, `'actioned'`) | |
| `priority` | `TEXT` | NOT NULL, DEFAULT `'medium'`, CHECK IN (`'critical'`, `'high'`, `'medium'`, `'low'`) | Set by admin |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |
| `reviewed_at` | `TIMESTAMPTZ` | NULL | Set when status moves to reviewed/dismissed/actioned |

**RLS Policies:**
- **SELECT**: Admins only. The reported merchant CANNOT see reports against them — per INVARIANTS: "Report content is never shown to the Curator being reported."
- **INSERT**: Public (unauthenticated) can insert — any buyer can report a store.
- **UPDATE**: Admins only — to set `status`, `priority`, `reviewed_at`.
- **DELETE**: Nobody.

**Indexes:**
- `reported_merchant_id`.
- `status` — for admin report queue.
- `priority, created_at` — for admin triage ordering.

---

### `trovea.admin_log`

Append-only audit trail of all admin actions. No mutations permitted post-insert.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | |
| `admin_id` | `UUID` | NOT NULL, REFERENCES `trovea.profiles(id)` | **Decision:** TypeScript `AdminLogEntry.actor` was a string literal `'admin'` — insufficient for accountability. DB uses a real FK. Phase 3B must: (1) add `admin_id: string` to `AdminLogEntry` in `merchant.types.ts`; (2) remove `actor: 'admin'` from the interface (it becomes derivable as a constant); (3) update `admin.store.ts` to populate `admin_id` from `auth.uid()` on insert. |
| `action` | `TEXT` | NOT NULL | e.g. "Store suspended", "Verification tier upgraded" |
| `target_merchant_id` | `UUID` | NULL, REFERENCES `trovea.merchants(id)` | NULL for actions not targeting a specific merchant (e.g., report review) |
| `target_receipt_id` | `UUID` | NULL, REFERENCES `trovea.receipts(id)` | NULL in most cases. For future receipt-related admin actions. |
| `note` | `TEXT` | NULL | Human-readable context |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | |

**No `updated_at`** — rows are never updated.

**RLS Policies:**
- **SELECT**: Admins only.
- **INSERT**: Only users with `profiles.role = 'admin'` can insert. Enforced via RLS CHECK `(auth.uid() IN (SELECT id FROM trovea.profiles WHERE role = 'admin'))`.
- **UPDATE**: Nobody. Audit log is immutable.
- **DELETE**: Nobody. Audit log is immutable.

**Triggers:**
- `admin_log_immutability` — `BEFORE UPDATE OR DELETE` → raises exception for any attempt.

**Indexes:**
- `admin_id`.
- `target_merchant_id`.
- `created_at` — for log ordering.

---

## Storage Buckets

These are Supabase Storage bucket definitions, not DB tables, but are designed here for Phase 3B.

| Bucket | Access | Max Size | Allowed Types | Notes |
|---|---|---|---|---|
| `merchant-avatars` | Public | 500 KB | `image/jpeg`, `image/png`, `image/webp` | Curator uploads their own avatar. Path: `{merchant_id}/avatar.{ext}` |
| `product-images` | Public | 5 MB per image | `image/jpeg`, `image/png`, `image/webp` | Path: `{merchant_id}/{product_id}/{filename}` |
| `portfolio-images` | Public | 10 MB per image | `image/jpeg`, `image/png`, `image/webp` | Path: `{merchant_id}/portfolio/{filename}` |
| `hero-images` | Public | 2 MB | `image/jpeg`, `image/png`, `image/webp` | Path: `{merchant_id}/hero.{ext}` |
| `digital-products` | **Private** | 500 MB per file | Any type | Private bucket. Signed URLs only. Path: `{merchant_id}/{product_id}/{filename}`. Signed URL issued only after confirmed `paid` receipt. See INVARIANTS: "Delivery URLs for digital products: one-time or time-limited — never permanently public." |
| `claim-proofs` | **Private** | 10 MB per file | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` | Private bucket. Proof images uploaded by buyers. Path: `{claim_id}/proof.{ext}`. Admin access only for bulk review — see INVARIANTS. |

**Storage RLS:**
- Public buckets: anyone can read (GET). Only the owning curator can upload/delete (authenticated, `merchant.owner_id = auth.uid()`).
- `digital-products`: No public read. Signed URLs issued by an Edge Function that validates a `paid` receipt exists for the buyer's email + product combo.
- `claim-proofs`: No public read. Curator can view their own merchant's proofs. Admin can view all.

---

## Client-Derived Values (NOT Stored in DB)

These values are computed at runtime from stored data. Phase 3B must not add them as columns.

| Value | Derived From | Used In |
|---|---|---|
| Drop state (`'pre'` / `'live'` / `'post'` / `'none'`) | `drops.scheduled_at` vs `Date.now()` and `drops.status` | StorefrontPage drop banner |
| Window state (`'open'` / `'closed'` / `'dormant'`) | `availability_windows.opens_at`, `closes_at`, `status` vs `Date.now()` | Vendor storefront, SchedulePage |
| Stagnant product flag | `products.created_at` + absence of `paid` receipts for that product | Dashboard action desk |
| Returning buyer flag | Count of `receipts` rows with same `buyer_phone` | Ledger buyers tab |
| Fill rate % | `bookings` count (`status = 'confirmed'`) / total available slots | Host InsightsPage |
| Pipeline value | Sum of `enquiries.package_value WHERE status IN ('new', 'in_discussion', 'active_project')` | Studio InsightsPage |
| Average response time | Avg of `enquiries.response_time_hours WHERE response_time_hours IS NOT NULL` | Studio InsightsPage |
| Merchant is_suspended read from admin store | `admin_log` actions + `merchants.is_suspended` column | Admin panel |
| Product `is_stagnant` | `products.created_at` > 30 days + no associated `paid` receipt | Archive page indicators |

---

## Migration Order

Tables must be created in this order to satisfy foreign key dependencies:

| Order | Table | FKs to |
|---|---|---|
| 1 | `trovea.profiles` | `auth.users` (provided by Supabase) |
| 2 | `trovea.merchants` | `trovea.profiles` |
| 3 | `trovea.collections` | `trovea.merchants` |
| 4 | `trovea.products` | `trovea.merchants`, `trovea.collections` |
| 5 | `trovea.receipts` | `trovea.merchants` |
| 6 | `trovea.claims` | `trovea.merchants`, `trovea.products` |
| 7 | `trovea.drops` | `trovea.merchants` |
| 8 | `trovea.availability_windows` | `trovea.merchants` |
| 9 | `trovea.bookings` | `trovea.merchants` |
| 10 | `trovea.enquiries` | `trovea.merchants` |
| 11 | `trovea.holds` | `trovea.merchants`, `trovea.products` |
| 12 | `trovea.store_reports` | `trovea.merchants` |
| 13 | `trovea.admin_log` | `trovea.profiles`, `trovea.merchants`, `trovea.receipts` |

**Schema creation:** `CREATE SCHEMA IF NOT EXISTS trovea;` must run before table 1.

**Triggers and RLS:** Applied after all tables exist.

**Storage buckets:** Configured via Supabase dashboard or `supabase/config.toml` — no migration SQL needed, but Phase 3B should include a `003_storage_buckets.sql` with bucket policies.

---

## Summary of All Tables

| Table | Rows (fixture) | Soft Delete | No DELETE | Notes |
|---|---|---|---|---|
| `trovea.profiles` | 5+ | No | No | Created by auth trigger |
| `trovea.merchants` | 5 | Yes (`deleted_at`) | No | One per curator in v1 |
| `trovea.collections` | 3 | No | No | Hard delete permitted |
| `trovea.products` | 22+ | Yes (`deleted_at`) | No | ID stable forever |
| `trovea.receipts` | 15+ | No | **YES** | Append-only + frozen columns |
| `trovea.claims` | 6 | No | No | 24h auto-expiry |
| `trovea.drops` | 3 | No | No | Draft drops deletable |
| `trovea.availability_windows` | 4 | No | No | |
| `trovea.bookings` | 6 | No | No | |
| `trovea.enquiries` | 5 | No | No | |
| `trovea.holds` | 3 | No | No | Expire via status |
| `trovea.store_reports` | 4 | No | No | Admin only |
| `trovea.admin_log` | 2+ | No | **YES** | Immutable append-only |

---

## Resolved Decisions (Phase 3A → 3B Handoff)

All items resolved. Phase 3B may generate SQL without further questions.

---

### Decision 1 — `delivery_fee` unit: **naira**

`receipt.delivery_fee` is stored as **INTEGER (naira)**, identical to every other monetary field in the schema. The INVARIANTS.md line *"receipt.delivery_fee is stored in kobo"* is an error — it conflicts with `terminal.store.ts` which sets delivery fee in naira with no conversion, and with `receipt.subtotal`/`receipt.total` which are in naira on the same row.

**Phase 3B action:** Correct INVARIANTS.md to read: *"`receipt.delivery_fee` is stored in **naira integers**, consistent with all other monetary fields."*

---

### Decision 2 — `admin_log.admin_id`: **UUID FK, replace `actor` literal**

`trovea.admin_log.admin_id` is `UUID NOT NULL REFERENCES trovea.profiles(id)`. The TypeScript `actor: 'admin'` string literal is removed from the interface — it is implied by the table name and never needs to be stored.

**Phase 3B actions:**
1. In `src/lib/types/merchant.types.ts`, update `AdminLogEntry`: remove `actor: 'admin'`, add `admin_id: string`.
2. In `src/lib/store/admin.store.ts`, replace all hardcoded `actor: 'admin'` with `admin_id: auth.uid()` (populated from the Supabase auth context at write time).
3. Update any UI that reads `entry.actor` to instead display a resolved admin display name from a join or a hardcoded "Admin" label.

---

### Decision 3 — `merchants.is_suspended`: **add column, update TypeScript**

`trovea.merchants.is_suspended BOOLEAN NOT NULL DEFAULT false` is confirmed. The Zustand admin store's `suspendedMerchantIds[]` array becomes a derived cache from this DB column — not the source of truth.

**Phase 3B actions:**
1. In `src/lib/types/merchant.types.ts`, add `is_suspended: boolean` to the `Merchant` interface.
2. In `src/lib/store/admin.store.ts`, `suspendedMerchantIds` should be initialised by querying merchants where `is_suspended = true`, rather than starting empty.

---

### Decision 4 — `trovea.store_reports`: **include it**

Confirmed. `StoreReport` exists in `merchant.types.ts` and has a full fixture. It is included in the schema and in the migration order (position 12). No further changes needed.

---

### Decision 5 — `claim-proofs` storage bucket: **include it, private**

Confirmed. The claim proof upload flow (Phase 2M) requires private storage. The bucket is private with signed-URL-only access. Proof images are keyed by claim ID: `{claim_id}/proof.{ext}`.

**Phase 3B action:** Add a `proof_url TEXT NULL` column to `trovea.claims` to store the storage path (not the full signed URL — signed URLs are generated on demand). The column was omitted from the initial design and must be added.

---

### Decision 6 — `profiles` INSERT via trigger: **confirmed, standard pattern**

Profile rows are created by a `SECURITY DEFINER` trigger (`on_auth_user_created`) that fires on `auth.users` INSERT. No RLS INSERT policy is needed on `trovea.profiles`. The trigger sets `role = 'buyer'` by default. Admin role is assigned directly in the DB by a superuser — no in-app creation flow (per INVARIANTS.md).

No Phase 3B action beyond implementing the trigger SQL.

---

### Decision 7 — Public receipt lookup: **`SECURITY DEFINER` RPC function**

The `anon` role is not granted any SELECT on `trovea.receipts` directly. Instead, Phase 3B creates:

```sql
CREATE OR REPLACE FUNCTION trovea.get_receipt_by_seal_id(p_seal_id TEXT)
RETURNS trovea.receipts
LANGUAGE sql
SECURITY DEFINER
SET search_path = trovea
AS $$
  SELECT * FROM trovea.receipts WHERE seal_id = p_seal_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION trovea.get_receipt_by_seal_id(TEXT) TO anon;
```

The `ReceiptPage` calls this RPC instead of a direct table query. This ensures no anon-role SELECT policy exists on the receipts table, and no row outside the matching `seal_id` is ever reachable.

---

### Decision 8 — `drops.product_ids` as `UUID[]`: **confirmed, array approach**

`trovea.drops.product_ids UUID[]` with no FK constraint is the chosen design. Products have stable IDs forever (INVARIANTS), so stale references are impossible in practice. A junction table is unnecessary complexity for a field that is always read and written as a complete list.

**Phase 3B action:** Add a DB function `trovea.validate_product_ids(merchant_id UUID, ids UUID[]) RETURNS BOOLEAN` that checks all IDs belong to the merchant — called as a pre-insert validation in the API layer, not as a constraint.

---

### Decision 9 — `handle` CHECK constraint: **`'^[a-z0-9_-]+$'` applied at DB and onboarding**

The CHECK `handle ~ '^[a-z0-9_-]+$'` is applied at the DB level. Phase 3B must also update `SetupStorePage` to enforce the same rule client-side: automatically lowercase the input, replace spaces with hyphens, strip any character outside `[a-z0-9_-]`, and show an inline error if the resulting handle is empty or too short (minimum 3 characters).

**Phase 3B action:** Update `SetupStorePage` handle field: normalize on `onChange`, validate on blur/submit with message `"Handle can only contain lowercase letters, numbers, hyphens, and underscores"`.

---

### Decision 10 — Expiry sweep jobs: **pg_cron, holds every 15 min, claims every hour**

Both jobs run via Supabase's pg_cron extension:

```sql
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
```

These go in `supabase/migrations/004_cron_jobs.sql`. The holds job runs more frequently because hold durations can be as short as 2 hours — a 15-minute sweep means a hold expires within 15 minutes of its window closing, which is acceptable.

---

*All decisions resolved. Phase 3B may proceed to generate SQL.*
