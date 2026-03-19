# Trove'a — Phase Plan

## What's Already Built

| Phase | Pages / Scope | Status |
|---|---|---|
| 1A | Design tokens, global CSS, all TS types, fixtures, utils, Zustand stores, all primitives, MerchantShell | ✅ Complete |
| 1B | AuthPage, SelectRolePage, IdentityPage, SetupStorePage, FirstItemPage | ✅ Complete |
| 1C | DashboardPage, ArchivePage, TerminalPage, LedgerPage | ✅ Complete |
| 1D | InsightsPage, DispatchPage, SettingsPage, NotificationsPage | ✅ Complete |
| 1E | StorefrontPage, ItemDetailPage, CollectionPage, ReceiptPage, SubmitReceiptPage | ✅ Complete |
| 1F | CustomizePage (The Architect) — all 5 layers, LivePreview, ArchitectShell | ✅ Complete |

---

## Upcoming Phases

### Phase 2A — Foundation: Store Type Primitive + Fixtures
**Goal:** Add `store_type` to the data model. Everything else depends on this.

**Deliverables:**
- Add `store_type: StoreType` to `Merchant` interface (already in ARCHITECTURE.md)
- Add all new fields to `Product` interface (duration, deposit_amount, has_variants, etc.)
- Add `StoreTypeConfig` to `StoreConfig`
- Create 5 fixture merchants (one per store type)
- Create fixture products for each store type (services, packages, digital products, menu items)
- New fixtures: `FIXTURE_WINDOWS`, `FIXTURE_BOOKINGS`, `FIXTURE_SLOTS`, `FIXTURE_DROPS`
- `useStoreType()` hook at `src/lib/hooks/use-store-type.ts`
- Update `App.tsx` — add new routes as placeholders
- Update `MerchantShell` nav — conditional items per store_type

**Files modified:** `merchant.types.ts`, `product.types.ts`, `receipt.types.ts`, `store-config.types.ts`, all fixture files, `App.tsx`, `MerchantShell.tsx`

**New files:** `src/lib/hooks/use-store-type.ts`, `src/lib/fixtures/vendor.ts`, `src/lib/fixtures/host.ts`, `src/lib/fixtures/digital.ts`, `src/lib/fixtures/studio.ts`

---

### Phase 2B — Onboarding: Store Type Selection Step
**Goal:** Add the missing `/onboarding/store-type` step and update adjacent onboarding pages.

**Deliverables:**
- New page: `/onboarding/store-type` — five visual selection cards (one per store type), each showing the type's identity line from the blueprint
- Update `SetupStorePage` — store type field pre-filled (read-only), initialization ceremony (700ms fade-to-black + wordmark pulse → `/dashboard`)
- Update onboarding progress bar to reflect 4 steps instead of 3
- Store type selection persists in local state between steps

**Files modified:** `SetupStorePage.tsx`, `IdentityPage.tsx`
**New files:** `StoreTypePage.tsx`, `StoreTypePage.module.css`

---

### Phase 2C — Dashboard + Shell Adaptive
**Goal:** Dashboard and MerchantShell fully branch on store_type.

**Deliverables:**
- `MerchantShell`: hide/show nav items per store_type; adapt nav labels; dev type switcher toggle
- `DashboardPage` full rebuild:
  - Module 1: Share Layer — copy link, QR download, share drawer
  - Module 2: Activation Checklist — 5 different checklists per type, dismisses on completion
  - Module 3: Vitals — different metrics per type
  - Module 4: Action Desk — 3 shortcuts per type
  - Module 5: Activity Log — event language per type
- Drop Announcements from Share Drawer: Canvas API card generation, copy caption / download PNG

**Per-type Vitals:**
- Collector: sales volume today + store traffic
- Vendor: pre-orders taken + remaining capacity
- Host: bookings confirmed + next available slot
- Digital Creator: downloads + top product
- Studio: enquiries received + pending packages

**Files modified:** `MerchantShell.tsx`, `MerchantShell.module.css`, `DashboardPage.tsx`, `DashboardPage.module.css`

---

### Phase 2D — Archive Adaptive + Digital Creator Catalogue
**Goal:** Archive branches into 5 different item models; new `/catalogue` route for Digital Creator.

**Deliverables:**
- `ArchivePage` restructured to branch on store_type:
  - **Collector**: existing flow + "Drops" tab (drop name, scheduled_at, select items)
  - **Vendor**: "Menu Items" with per-window cap field, categories
  - **Host**: Service list with duration + deposit fields, inactive toggle
  - **Studio**: Packages with price_type (fixed/custom), scope fields, per-package intake form builder
- New page: `/catalogue` (Digital Creator only) — preview asset + delivery asset, is_free toggle, early_access_price/cap, delivery method selector
- Item creation drawer/modal adapts per type

**Files modified:** `ArchivePage.tsx`, `ArchivePage.module.css`, `App.tsx`
**New files:** `CataloguePage.tsx`, `CataloguePage.module.css`

---

### Phase 2E — New Curator Surfaces: Schedule + Bookings
**Goal:** Two entirely new pages for Vendor and Host.

**Deliverables:**
- New page: `/schedule` — dual render:
  - Host view: week calendar, working days/hours config, break times, date blocking, slot preview
  - Vendor view: availability window management, create window (open_at, close_at, per-item caps), window status list
- New page: `/bookings` — Host + Studio:
  - Four tabs: Pending / Confirmed / Completed / Cancelled
  - Claims tab: proof image viewer, Accept (pre-fills Terminal), Reject (WhatsApp message), 24h countdown

**New files:** `SchedulePage.tsx`, `SchedulePage.module.css`, `BookingsPage.tsx`, `BookingsPage.module.css`

---

### Phase 2F — Terminal Adaptive
**Goal:** Terminal Stage 1 branches per store_type while the 3-stage shell remains.

**Deliverables:**
- Stage 1 per type:
  - Collector: existing inventory select
  - Vendor: menu items (window must be open)
  - Host: service + slot from calendar
  - Digital Creator: catalogue select + buyer email
  - Studio: package select or custom line
- Stage 2 Attribution: Delivery Fee field (collapsible, hidden for Digital Creator), proper "Add Discount" collapsible UX
- Draft receipt auto-save every 30s, resume prompt on load

**Files modified:** `TerminalPage.tsx`, `TerminalPage.module.css`, `terminal.store.ts`

---

### Phase 2G — Ledger + Insights Adaptive
**Goal:** Existing pages get store-type labels and new metric cards.

**Deliverables:**
- `LedgerPage`: tab labels, status labels, amount column label all adapt per type; "Buyers" tab; bulk payment method tagging
- `InsightsPage`: universal Pulse + Log Preview cards; store-type specific cards (2 per type per blueprint)

**Files modified:** `LedgerPage.tsx`, `LedgerPage.module.css`, `InsightsPage.tsx`, `InsightsPage.module.css`

---

### Phase 2H — Settings Expanded
**Goal:** Settings gets all new feature toggle panels.

**Deliverables:**
- Trovéa Checkout toggle + bank account setup (account number, bank name dropdown with major Nigerian banks, account name)
- Hold System toggle + configuration (duration selector, auto-confirm toggle, max concurrent holds)
- Lightweight Payment Proof (always available when Checkout is OFF — no config needed, just enable section)
- Store Pause — pause/resume with optional return date + message
- Cancellation Policy (Host/Studio)
- Location/Address (Host/Studio — shown on Booking Seal)
- Verification Tier display (current tier + progress toward next)
- Store-type-specific Architect controls config

**Files modified:** `SettingsPage.tsx`, `SettingsPage.module.css`

---

### Phase 2I — Public Storefront: All Enhancements + All Store Types
**Goal:** The largest phase. All 90+ UI enhancements + 4 new store-type render modes across public pages.

**Sub-phases (can be split if needed):**

**2I-a: StorefrontPage enhancements (Collector)**
All items from `TROVEA_ENHANCEMENT_SPEC.md` Sections 1 and 7.

**2I-b: StorefrontPage store-type adaptive**
- Vendor: Window Status + Menu section, 4 store states (Open/Post-Window/Dormant/Upcoming)
- Host: Service Menu + Booking CTA, Calendar Availability Preview, Portfolio Gallery
- Digital Creator: Digital Catalogue section, Featured section
- Studio: Service Packages section, Portfolio Gallery (masonry/grid/editorial), Enquiry Form
- Universal: Store Pause banner, Verification badge, "Report this store" footer link

**2I-c: ItemDetailPage + CollectionPage enhancements**
All items from `TROVEA_ENHANCEMENT_SPEC.md` Sections 2 and 3.

**2I-d: ReceiptPage + SubmitReceiptPage enhancements**
All items from `TROVEA_ENHANCEMENT_SPEC.md` Sections 4 and 5. ReceiptPage gets store-type label adaptation (5 label sets).

**New files:** `BookingFlowPage.tsx` (`/store/:handle/book` — Host slot booking)

---

### Phase 2J — The Architect Enhanced + Adaptive
**Goal:** All 1F enhancements + per-type additional controls.

**Deliverables:**
- All items from `TROVEA_ENHANCEMENT_SPEC.md` Section 6 (LivePreview, layer improvements, Publish ceremony)
- New 6th layer "Store Settings" per type:
  - Collector: featured picker, drop banner text, sold-out overlay style
  - Vendor: window banner text, category order, pre-order CTA text
  - Host: booking CTA text, calendar format, portfolio density
  - Digital Creator: catalogue display, preview style, free badge style
  - Studio: portfolio layout, enquiry form fields, package card style
- Section visibility list reflects store-type-specific sections

**Files modified:** All 1F files, `architect.types.ts`

---

### Phase 2K — Buyer Features: The Bag + Urgency Signals
**Goal:** Multi-item buyer experience.

**Deliverables:**
- `bagStore` at `src/lib/store/bag.store.ts` (localStorage-backed, per-store key)
- "Add to Bag" primary CTA (replaces "Chat to Buy" on Collector/Vendor/Digital Creator storefronts)
- Sticky Bag bar (bottom fixed) + Bag drawer (bottom sheet)
- "Send to Curator" generates WhatsApp message with full bag contents
- Urgency signals: "Only X left", "X of Y remaining", "X slots left this week", "Selling fast", "Closes in X hours"

---

### Phase 2L — Trovéa Checkout (Claim System)
**Goal:** Full bank-transfer-proof claim flow.

**Deliverables:**
- Public: Claim Sheet (item details + bank account + upload proof + submit)
- Item → "Pending Confirmation" state after submission
- Claim review in Archive/Bookings: proof image viewer, Accept → pre-fills Terminal, Reject → WhatsApp
- 24h auto-expiry
- CTA adapts per type: "Claim" / "Claim Pre-order" / "Book & Pay Deposit"

---

### Phase 2M — Hold System + Payment Proof
**Goal:** Lightweight reservation and informal payment proof.

**Deliverables:**
- "Hold for me" secondary CTA (when `merchant.holds_enabled = true`)
- Hold modal: name + WhatsApp + optional note
- "On Hold" storefront status
- Auto-expiry + WhatsApp notifications
- "I've paid" proof upload flow (when Checkout is OFF)

---

### Phase 2N — Trust Layer
**Goal:** Verification badges, store reporting, pause storefront rendering.

**Deliverables:**
- Verification badges on storefront header and Seal page (copper/gold tiers)
- "Report this store" flow (category → description → evidence → submit)
- Store Pause: quiet banner, all CTAs disabled, WhatsApp contact remains active

---

### Phase 2O — Drop Announcements
**Goal:** Canvas-generated shareable announcement card.

**Deliverables:**
- Announcement builder in Dashboard Share Drawer / Archive
- Canvas API: store palette + typography + headline + store link
- 1080×1080 and 1080×1920 PNG output
- "Copy caption" and "Download card" independently

---

### Phase 2P — Admin Panel
**Goal:** Internal `/admin` surface for platform accountability.

**Routes:** `/admin`, `/admin/stores`, `/admin/reports`, `/admin/verification`, `/admin/suspensions`, `/admin/receipts`

**Deliverables:**
- Platform health overview (new stores, receipts, pending reports, active claims)
- Store search + management (grant/revoke tier, suspend, unsuspend)
- Report review with priority queue (Critical/High/Medium/Low)
- Verification tier management
- Append-only admin action log

---

## Enhancement Spec Reference

The 90+ UI/UX enhancements for Phase 1E and 1F pages are documented in `TROVEA_ENHANCEMENT_SPEC.md`. This file is the authoritative checklist for Phase 2I and 2J.

Sections in the enhancement spec:
1. StorefrontPage (sections 1.1–1.9)
2. ItemDetailPage (sections 2.1–2.8)
3. CollectionPage (sections 3.1–3.4)
4. ReceiptPage (sections 4.1–4.7)
5. SubmitReceiptPage (sections 5.1–5.3)
6. The Architect (sections 6.1–6.9)
7. Cross-cutting (section 7 — whileInView, whileTap, data-palette, safe areas)

Implementation batch order:
- **Batch 1 (structural):** data-palette propagation, stagger grid animation, image aspect ratio 3:4, sticky CTA bar, about section redesign
- **Batch 2 (visual richness):** cinematic header background, Ken Burns + vignette, featured horizontal strip, receipt line item thumbnails, PaletteLayer mini-grid
- **Batch 3 (micro-details):** price symbol in accent colour, collection accent bar, success ceremony animation, signature type chips, LivePreview store header, universal whileTap/whileInView

---

## What NOT to Build in Phase 1

These belong to Phase 2+ (real Supabase wiring, not yet):
- Real authentication (Supabase auth)
- Real database reads/writes
- File uploads to Supabase Storage
- Real-time inventory updates
- Email delivery for digital products
- Payment processing (Paystack)
- Cron jobs for expiry
- Server-side rendering / ISR
- SEO meta tags (defer to SSR phase)

In Phase 1, all of the above are simulated with local state and fixtures.