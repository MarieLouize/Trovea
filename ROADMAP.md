# Trovéa — System Audit & Production Roadmap

> Last updated: 2026-04-08
> Branch: phase-2-5-ledger-architect-settings-overhaul

---

## System State (Honest Assessment)

### What's solid

- **Auth** — Supabase OTP, session management, protected routes. Production-ready.
- **Merchant dashboard shell** — Navigation, shell layout, all 5 store types routed correctly.
- **All 5 store types rendered** — Fixture data, visual layouts, and adaptive dashboards complete.
- **Architect layer system** — New feel-first customisation (Theme, Color, Shape, Motion, Layout, Store) fully wired in-memory.
- **Zustand store architecture** — Clean separation: auth, merchant, archive, ledger, basket, hold, ui, terminal, admin.
- **Supabase read layer** — Query functions exist for merchants, products, receipts, bookings. Structured correctly.

### What's broken or fake

- **Zero DB writes** — The entire app is read-only against Supabase. `updateMerchant()` exists but is never called. Publishing in the Architect only updates Zustand memory and is lost on refresh.
- **Public storefront reads from Zustand, not the handle** — `/store/:handle` pulls from `useMerchantStore`, not `getMerchantByHandle(handle)`. A visitor who isn't the logged-in merchant sees whoever is loaded in state.
- **`/store/:handle/book`** — Route exists in App.tsx, no component built. Dead link.
- **Checkout paths** — Fragmented across 5 store types. None are fully end-to-end.

---

## Complete Route Map

| Route | Page | Protection | Status |
|---|---|---|---|
| `/auth` | AuthPage | Public | Complete — OTP via Supabase |
| `/dashboard` | DashboardPage | Protected | Complete |
| `/archive` | ArchivePage | Protected | Complete — adaptive per type |
| `/terminal` | TerminalPage | Protected | Complete — seal issuance |
| `/ledger` | LedgerPage | Protected | Complete — payment tracking |
| `/receipts` | ReceiptsPage | Protected | Complete — list view |
| `/catalogue` | CataloguePage | Protected | Complete — Digital Creator only |
| `/schedule` | SchedulePage | Protected | Complete — Vendor/Host |
| `/bookings` | BookingsPage | Protected | Complete — Host/Studio |
| `/insights` | InsightsPage | Protected | Complete |
| `/dispatch` | DispatchPage | Protected | Complete |
| `/settings` | SettingsPage | Protected | Complete |
| `/notifications` | NotificationsPage | Protected | Complete |
| `/onboarding/*` | Onboarding flow | Protected | Complete — 5 steps |
| `/store/:handle/customize` | CustomizePage | Public | Complete — Architect shell, in-memory only |
| `/store/:handle` | StorefrontPage | Public | Partial — layout works, checkout fragmented |
| `/store/:handle/item/:item_id` | ItemDetailPage | Public | Partial — CTAs incomplete per type |
| `/store/:handle/c/:collection_slug` | CollectionPage | Public | Partial |
| `/store/:handle/book` | — | Public | **NOT BUILT** — dead route |
| `/receipt/:receipt_id` | ReceiptPage | Public | Complete |
| `/submit-receipt/:intent_id` | SubmitReceiptPage | Public | Complete |
| `/admin` | AdminOverviewPage | Protected | Partial — UI complete, backend not wired |
| `/admin/stores` | AdminStoresPage | Protected | Partial |
| `/admin/reports` | AdminReportsPage | Protected | Partial |
| `/admin/verification` | AdminVerificationPage | Protected | Partial |
| `/admin/suspensions` | AdminSuspensionsPage | Protected | Partial |
| `/admin/receipts` | AdminReceiptsPage | Protected | Partial |
| `/` | Redirect to `/dashboard` | — | — |
| `*` | NotFoundPage | Public | Complete |

---

## Data Layer

### Architecture

- **Zustand** — all client state; no persistence except Supabase reads on init
- **Supabase** — auth + postgres; reads wired, writes not called
- **Fixtures** — full fallback when `VITE_SUPABASE_URL` is not set; dev mode only

### Data flow on app init

```
authStore.initSession()
  ↓
if (Supabase configured):
  getMerchantByOwnerId(user.id)
    → setMerchant()
    → archiveStore.initFromDB(merchant.id)
    → ledgerStore.initFromDB(merchant.id)
else:
  load FIXTURE_MERCHANT (hardcoded merchant-001)
    → archiveStore.initFromDB('merchant-001')
    → ledgerStore.initFromDB('merchant-001')
```

### Stores

| Store | Purpose | Persistence | Notes |
|---|---|---|---|
| `auth.store.ts` | Session + OTP | Supabase auth | Complete |
| `merchant.store.ts` | Merchant context | DB read on init | No writes |
| `archive.store.ts` | Products + filters | DB read on init | No create/edit/delete |
| `ledger.store.ts` | Receipts + payment | DB read on init | No writes |
| `basket.store.ts` | Inquiry cart | Local state only | Clears on refresh; missing merchantId/storeType context |
| `hold.store.ts` | Product holds | Local state | No DB persistence |
| `terminal.store.ts` | Seal issuance | Local state | No DB write on seal |
| `ui.store.ts` | Toast / modals | Local state | Complete |
| `onboarding.store.ts` | Onboarding state | Local state | No DB save on completion |
| `guide.store.ts` | Tutorial state | Local state | Complete |
| `admin.store.ts` | Admin dashboard | Local state | No writes |

### Available DB query functions (unused on write side)

```
merchants:  getMerchantByHandle, getMerchantById, getMerchantByOwnerId, updateMerchant
products:   getProductsByMerchant, createProduct, updateProduct, deleteProduct
receipts:   getReceiptsByMerchant, markAsPaid, createReceipt
bookings:   getBookingsByMerchant, createBooking, updateBooking
drops:      getDropsByMerchant, createDrop
enquiries:  getEnquiriesByMerchant, createEnquiry
```

---

## The Architect / Public Page Connection

### How it currently works

```
CustomizePage
  → handleUpdate(patch) sets local draftConfig state
  → isDirty flag computed (configsEqual)
  → onPublish: 800ms delay → setMerchant({ store_config: draftConfig })
  → Toast "Store updated!"

StorefrontPage
  → const merchant = useMerchantStore(s => s.merchant)
  → uses merchant.store_config for layout, card_style, palette, etc.
  → sees changes immediately in the same session
```

### What's missing

1. **Write side** — `CustomizePage.onPublish()` never calls `updateMerchant()`. Changes are in-memory only; lost on refresh.
2. **Read side** — `StorefrontPage` does not fetch by `handle` param. A real visitor (not the logged-in merchant) sees whoever is in Zustand state.
3. **Shape / motion / font_color application** — `data-shape` and `data-motion` attrs are set on `StorefrontPage` root, but `ItemDetailPage`, `CollectionPage`, and `ReceiptPage` don't apply them yet.

### What "fully wired" looks like

```
CustomizePage.onPublish()
  → updateMerchant({ store_config: draftConfig })   ← Supabase write
  → setMerchant(updated)                            ← Zustand sync

StorefrontPage (on mount)
  → getMerchantByHandle(handle)                     ← Supabase read by URL param
  → render with fetched config                      ← real visitor sees real config
```

---

## Store Type Implementation Status

| Type | Storefront | Checkout Flow | Dashboard | Gaps |
|---|---|---|---|---|
| **Collector** | Complete | Partial — Claim + Hold work, multi-item missing | Complete | Multi-item ClaimSheet, follows/save |
| **Vendor** | Partial | Partial — WhatsApp path only | Complete | Browsable menu when closed, bundled order |
| **Host** | Partial | Broken — `/book` route dead | Complete | Booking page not built |
| **Digital Creator** | Partial | Partial — email drawer exists but not end-to-end | Complete | Email checkout completion, free delivery URL |
| **Studio** | Partial | Partial — enquiry form exists, deposit not wired | Complete | Deposit booking, quote flow |

---

## Production Readiness by Dimension

| Dimension | Status | Risk |
|---|---|---|
| Routing | 90% | Low — 1 dead route |
| Auth | 100% | None |
| Data persistence | 10% | **Critical** — all writes ephemeral |
| Merchant dashboard | 85% | Low — loading states missing in places |
| Public storefront | 60% | High — layout works, checkout fragmented |
| Buyer checkout | 40% | **Critical** — incomplete across all types |
| Architect → Storefront | 30% | **Critical** — in-memory only |
| Admin panel | 50% | Medium — UI done, backend not wired |
| Performance | Unknown | Medium — StorefrontPage is 1,912 lines |
| Testing | 0% | **Critical** |

---

## Production Roadmap

### Sequencing

```
Track 1 — Backend Wiring          ← must come first; unlocks everything
    ↓
Track 2 + Track 3 in parallel    ← checkout complete + architect fully real
    ↓
Track 4 — Operational Flows      ← merchant can run day-to-day
    ↓
Track 5 — Polish & Zero States   ← looks and feels finished
    ↓
Track 6 + Track 7 in parallel    ← prod confidence
```

---

### Track 1 — Backend Wiring

**Goal:** Any change a merchant makes persists to DB. Any visitor gets the correct store.

This is the prerequisite for all other tracks. Nothing below is reliably testable until data is real.

#### 1.1 Architect → DB

- `CustomizePage.onPublish()` calls `updateMerchant({ store_config: draftConfig })`
- Show saving state in publish button; handle error with toast + retry
- On success: update Zustand with returned merchant (not the draft — use DB response)

#### 1.2 Public storefront — fetch by handle

- `StorefrontPage` fetches `getMerchantByHandle(handle)` on mount
- Loading skeleton while fetching
- 404 if handle not found
- Decouple from `useMerchantStore` — merchant is fetched fresh per visit
- Result: any visitor (logged out, different merchant) sees the correct store

#### 1.3 Product CRUD

- Archive `createProduct()` and `updateProduct()` calls on save
- Archive `deleteProduct()` on remove (soft delete via `deleted_at`)
- Ghost card → real product on smart paste save
- Optimistic update pattern: update Zustand immediately, rollback on error

#### 1.4 Receipt + seal writes

- `createReceipt()` called in Terminal on seal issuance
- `markAsPaid()` called in Ledger on payment confirmation
- Hold creation writes to DB (currently local only)

#### 1.5 Session + error resilience

- Basket persisted to localStorage — survives refresh
- `clearIfDifferentStore()` on basket when navigating to a different handle
- Supabase error → show toast + fallback to last known state (not fixture)
- Re-fetch merchant on tab focus (catches config changes from other sessions)

---

### Track 2 — Checkout Completeness

**Goal:** Every store type has a working, end-to-end buyer flow.

#### 2.1 Collector — multi-item

- Basket store gains `merchantId` and `storeType` context
- Multi-item `ClaimSheet` — itemised list, combined WhatsApp message
- `ItemDetailPage` bag button shows live item count badge
- `StickyBag` shows on storefront when basket has items

#### 2.2 Vendor — browsable menu

- Menu renders in browsable read-only state when window is closed (no pre-order CTA)
- `ItemDetailPage` for `menu_item` type — adapted labels, no quantity, shows window status
- `DigitalCartCheckoutDrawer` adapted for vendor pre-order bundles

#### 2.3 Host — booking page

- Build `/store/:handle/book` page component (extract slot selection from StorefrontPage)
- Service selection → date picker → time slot → confirmation
- Deposit capture on booking (links to payment proof flow)
- Booking confirmation → `createBooking()` → receipt issued

#### 2.4 Digital Creator — email checkout

- `DigitalCartCheckoutDrawer` end-to-end: email input → payment → delivery URL
- Free item: instant delivery URL shown without payment
- Early access pricing applies when `early_access_cap` not yet reached
- `createReceipt()` with delivery URL on purchase

#### 2.5 Studio — deposit booking

- Package `ItemDetailPage`: enquiry form → `createEnquiry()` → confirmation
- Deposit flow: Hold the slot → payment proof → `markAsPaid()`
- Quote flow: custom package → enquiry → merchant responds via Ledger

---

### Track 3 — Store Config Architecture

**Goal:** Theme, palette, shape, and motion choices apply consistently across all public surfaces.

#### 3.1 All public pages inherit config

- `ItemDetailPage`: apply `data-shape`, `data-motion` from `store_config`; inject font color vars
- `CollectionPage`: same
- `ReceiptPage`: same
- Each page fetches its own merchant config by handle (Track 1 prerequisite)

#### 3.2 Font color system

- `buildFontColorVars(font_color)` injected into inline style on `.sf-themed` root
- `--sf-fg` and family override correctly per selection
- Test all 9 font color options against their paired palettes

#### 3.3 Shape + motion CSS propagation

- Confirm `[data-shape]` and `[data-motion]` CSS vars cascade into all child components
- Cards, buttons, badges, pills, modals all pick up `--sf-r-*` vars
- Motion: card hover lift, entrance animations driven by `--sf-dur-enter` var

#### 3.4 Theme defaults applied correctly

- Selecting a theme in Architect writes `card_style`, `layout`, `palette`, `typography` to config
- These all reflect in LivePreview and in the real storefront after publish (Track 1)
- Test all 15 themes end-to-end

---

### Track 4 — Operational Flows

**Goal:** Merchants can manage their store day-to-day without touching fixtures.

#### 4.1 Onboarding → DB

- Final onboarding step calls `createMerchant()` (or `updateMerchant()` if shell exists)
- Store config seeded with theme defaults for their store type
- Merchant redirected to dashboard post-onboarding

#### 4.2 Settings → DB

- `checkout_enabled`, `holds_enabled`, `hold_duration_hours` → `updateMerchant()`
- `is_paused`, `pause_message`, `pause_return_date` → `updateMerchant()`
- Bank account details → `updateMerchant()`
- Dirty state bar matches Architect pattern; save button with loading state

#### 4.3 Admin → DB

- Suspension toggle → `updateMerchant({ is_suspended: true })`
- Verification tier update → `updateMerchant({ verification_tier })`
- Report resolution → `updateReport({ status, reviewed_at })`
- Admin log entry written on every action

#### 4.4 Notifications

- Polling or Supabase real-time for new receipts, claims, holds
- Notification badge count accurate across sessions
- Mark-as-read persisted

---

### Track 5 — Polish & Zero States

**Goal:** The app looks and feels finished at every edge.

#### 5.1 Zero states

- Archive: no products → onboarding prompt to add first item
- Ledger: no receipts → prompt to issue first seal
- Storefront: merchant hasn't published yet → soft "coming soon" state
- Bookings: no bookings → show empty calendar
- Drops: no drops → prompt to schedule first drop

#### 5.2 Loading states

- Skeleton screens on all async page loads
- Spinner on all CTA buttons during async ops (not just publish)
- Optimistic updates where appropriate (archive edits)

#### 5.3 Motion & ceremony

- Terminal seal issuance ceremony — full animation sequence
- Architect publish ceremony — brief celebration on first publish
- Page entrance animations consistent across all merchant pages
- `prefers-reduced-motion` fully respected (forces `still` motion mode)

#### 5.4 Copy & language

- Consistent store-type-aware labels everywhere (no "item" leaking into Studio)
- Number formatting: ₦ with commas, duration in minutes/hours
- Date formatting: relative ("3 hours ago") vs absolute ("Saturday, 12 Apr")

#### 5.5 Edge cases

- Pause enforcement: public storefront gates behind pause screen when `is_paused`
- Suspension: storefront shows 404-equivalent when `is_suspended`
- Invalid handle: proper 404 page
- Expired holds: auto-release in Ledger

---

### Track 6 — Performance & Reliability

**Goal:** The app works correctly under real conditions.

#### 6.1 Code splitting

- `StorefrontPage.tsx` (1,912 lines) split into feature components:
  - `CollectorStorefront`, `VendorStorefront`, `HostStorefront`, `DigitalStorefront`, `StudioStorefront`
  - Shared: `StoreHeader`, `ProductGrid`, `HeroSection`, `AboutSection`, `ContactSection`
- Lazy load all public routes (`/store/*`, `/receipt/*`)
- Lazy load admin routes

#### 6.2 Data fetching

- Add query caching layer (React Query or SWR) for public page fetches
- Merchant profile cached by handle for 60s; invalidate on publish
- Product list paginated for large archives

#### 6.3 Images

- Hero images lazy-loaded with placeholder blur
- Product image grid: `loading="lazy"` on all below-fold images
- Serve WebP where supported

#### 6.4 Error boundaries

- Every public route wrapped in an error boundary
- Boundary shows friendly "something went wrong" with retry
- Supabase timeouts → fallback to stale cache, not blank screen

---

### Track 7 — Testing & QA

**Goal:** Confidence to ship.

#### 7.1 Happy path E2E (one per store type)

- Collector: browse → add to bag → submit claim → merchant marks paid → receipt shows
- Vendor: view menu → pre-order via WhatsApp → order tracked in Ledger
- Host: view services → book slot → deposit → confirmation
- Digital: browse catalogue → purchase → receive delivery URL
- Studio: view packages → send enquiry → deposit booking

#### 7.2 Architect → Storefront round trip

- Change theme in Architect → publish → visit `/store/:handle` as guest → config reflects
- Change palette → publish → palette applies on public page

#### 7.3 Auth flows

- OTP send and verify
- Session expiry → redirect to auth → return to intended page
- Protected route redirect

#### 7.4 Data integrity

- Basket clears when navigating to different store handle
- Hold expiry correctly gates re-purchase
- Sold-out state propagates correctly to product grid

---

## Key Files Reference

| File | Purpose | Size | Notes |
|---|---|---|---|
| `src/App.tsx` | Route definitions + auth init | — | DEV_MERCHANTS hardcoded |
| `src/pages/public/CustomizePage.tsx` | Architect page shell | 60 lines | No DB write |
| `src/pages/public/StorefrontPage/StorefrontPage.tsx` | Public store | 1,912 lines | Needs splitting |
| `src/components/ArchitectShell/ArchitectShell.tsx` | Layer UI | — | Complete |
| `src/lib/store/merchant.store.ts` | Merchant Zustand store | — | `updateMerchant` not called |
| `src/lib/db/queries/merchants.ts` | Supabase merchant queries | — | `updateMerchant` ready to use |
| `src/lib/store/basket.store.ts` | Cart state | — | No merchantId context |
| `src/lib/fixtures/` | All mock data | 15 files | Remove after Track 1 |
| `src/lib/types/merchant.types.ts` | Core types | — | `StoreConfig` complete |
| `src/lib/palette-theme.ts` | Palette + font color system | — | Complete |
| `src/lib/constants/themes.ts` | 15 store themes | — | Complete |

---

## Immediate Next Action

**Track 1.1 + 1.2** — the two-file Architect wire:

1. `CustomizePage.tsx` — call `updateMerchant({ store_config: draftConfig })` inside `onPublish`
2. `StorefrontPage.tsx` — fetch `getMerchantByHandle(handle)` on mount instead of reading from Zustand

These two changes make the architect real and make the public page correct for all visitors. Everything else in the roadmap builds on top of these.
