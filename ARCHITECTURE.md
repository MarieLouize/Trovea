# Trove'a — Architecture Reference

> Source of truth for all type shapes, constant field names, store APIs, and fixture data.
> When this doc conflicts with your training data, this doc is correct.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Styling | CSS Modules (`*.module.css`) + global tokens (`src/styles/tokens.css`) |
| State | Zustand 4 |
| Animation | Framer Motion — aliased at `@/lib/motion` |
| Router | React Router v6 |
| Icons | Lucide React |
| Path alias | `@/` = `src/` |

---

## Full File Structure

```
src/
├── styles/
│   ├── tokens.css              ← ALL CSS custom properties (imported first in main.tsx)
│   ├── global.css              ← Typography utils, layout classes, skeleton
│   └── cards.css              ← Product card styles (5 variants), side-effect import
│
├── lib/
│   ├── types/
│   │   ├── merchant.types.ts   ← Merchant, StoreConfig, StoreType, all enums
│   │   ├── product.types.ts    ← Product, ProductVariant, Collection, ProductStatus
│   │   ├── receipt.types.ts    ← Receipt, ReceiptLineItem, ReceiptLogEntry, ShipmentStatus
│   │   ├── store-config.types.ts ← PaletteDefinition, LayoutDefinition, TypographyDefinition,
│   │   │                           CardStyleDefinition, SignatureDefinition
│   │   └── index.ts            ← re-exports everything from above
│   │
│   ├── fixtures/
│   │   ├── merchant.ts         ← FIXTURE_MERCHANT (Tola's Archive, Collector type)
│   │   ├── products.ts         ← FIXTURE_PRODUCTS (22), FIXTURE_COLLECTIONS (3)
│   │   ├── receipts.ts         ← FIXTURE_RECEIPTS (15), FIXTURE_CLAIMS (6)
│   │   └── index.ts            ← re-exports all fixtures
│   │
│   ├── utils/
│   │   ├── format.ts           ← formatCurrency, formatCurrencyFull, formatDate,
│   │   │                          formatRelativeDate, formatPhone, formatLastActive,
│   │   │                          formatSealId, truncate
│   │   ├── smart-paste.ts      ← parseSmartPaste(text) → ParsedItem[]
│   │   └── whatsapp.ts         ← buildChatToBuyLink, buildClaimConfirmLink,
│   │                              buildStoreContactLink
│   │
│   ├── constants/
│   │   ├── palettes.ts         ← PALETTES: PaletteDefinition[]
│   │   ├── layouts.ts          ← LAYOUTS: LayoutDefinition[]
│   │   ├── typography.ts       ← TYPOGRAPHY_STACKS: TypographyDefinition[]
│   │   └── signatures.ts       ← SIGNATURES: SignatureDefinition[]
│   │
│   ├── motion.ts               ← Re-exports from framer-motion:
│   │                              m, AnimatePresence, Reorder, useDragControls,
│   │                              useAnimation, LazyMotion, motionFeatures
│   │
│   └── store/
│       ├── ui.store.ts         ← Toasts, loading, drawer, modal
│       ├── terminal.store.ts   ← Stage machine, visor, buyer info, discount
│       ├── archive.store.ts    ← Products, filters, ghost cards, mint
│       └── ledger.store.ts     ← Receipts, tabs, multi-select, status updates
│
├── components/
│   ├── primitives/
│   │   ├── BaseDrawer/         ← Bottom/right slide drawer, drag-to-dismiss
│   │   ├── Toast/              ← ToastContainer + auto-dismiss
│   │   ├── Tooltip/            ← 4-position hover tooltip
│   │   ├── PopupModal/         ← Centered modal, backdrop dismiss
│   │   ├── CustomDropdown/     ← Neumorphic select replacement
│   │   └── ErrorBoundary/      ← Wraps all public routes in App.tsx
│   │
│   └── merchant/
│       └── MerchantShell/      ← Desktop sidebar + mobile bottom nav + Terminal FAB
│                                  Uses <Outlet /> — wraps all /dashboard, /archive, etc.
│
├── pages/
│   ├── auth/
│   │   └── AuthPage            ← idle / pending-inbox / sent states
│   │
│   ├── onboarding/
│   │   ├── SelectRolePage      ← Curator vs Explorer portal cards
│   │   ├── IdentityPage        ← display name + WhatsApp
│   │   ├── SetupStorePage      ← store name, handle (debounced), bio
│   │   └── FirstItemPage       ← Smart Paste + manual form
│   │
│   ├── merchant/               ← All wrapped in MerchantShell via <Outlet />
│   │   ├── DashboardPage       ← Vitals, action desk, checklist, activity log, share drawer
│   │   ├── ArchivePage         ← Status tabs, collection chips, product rows, Smart Paste drawer
│   │   ├── TerminalPage        ← Composition → Attribution → Issuance stages
│   │   ├── LedgerPage          ← 4 tabs, receipt detail drawer, mark paid, bulk actions
│   │   ├── InsightsPage        ← KPI cards, chart, top products, activity feed
│   │   ├── DispatchPage        ← Shipment pipeline, mark shipped/received
│   │   ├── SettingsPage        ← Inline editable fields, store-open toggle, dirty bar
│   │   └── NotificationsPage   ← Derived notifs from receipts + claims
│   │
│   └── public/                 ← Not wrapped in MerchantShell
│       ├── StorefrontPage/     ← /store/:handle — 5 layouts × 5 card styles
│       ├── ItemDetailPage/     ← /store/:handle/item/:item_id
│       ├── CollectionPage/     ← /store/:handle/c/:collection_slug
│       ├── ReceiptPage/        ← /receipt/:receipt_id — The Seal
│       ├── SubmitReceiptPage/  ← /submit-receipt/:intent_id — Deferred Checkout
│       └── CustomizePage/      ← /store/:handle/customize — The Architect
│           ├── architect.types.ts
│           └── components/
│               ├── ArchitectShell/
│               ├── LayerNav/
│               ├── LivePreview/
│               └── layers/
│                   ├── PaletteLayer/
│                   ├── LayoutLayer/
│                   ├── TypographyLayer/
│                   ├── CardStyleLayer/
│                   └── SignatureLayer/
│
├── App.tsx                     ← Full route tree
└── main.tsx                    ← Entry: imports tokens.css then global.css
```

---

## Type Shapes — Exact Field Names

These have caused bugs before. Trust these shapes over any other source.

### `merchant.types.ts`

```typescript
type StoreType = 'collector' | 'vendor' | 'host' | 'digital_creator' | 'studio'

type StorePalette   = 'maroon' | 'velvet' | 'parchment' | 'slate' | 'onyx'
type StoreLayout    = 'grid-dense' | 'grid-airy' | 'editorial' | 'masonry' | 'minimal'
type StoreTypography = 'editorial' | 'modern' | 'mono' | 'warm' | 'bold'
type CardStyle      = 'clean-square' | 'rounded-float' | 'polaroid' | 'film-strip' | 'minimal-line'
type StoreSignature = 'the-bale' | 'the-vault' | 'the-atelier' | 'the-archive' | 'the-gallery'

interface SectionStates {
  'section-hero': boolean
  'section-about': boolean
  'section-slots': boolean
  'section-featured': boolean
}

type SectionKey =
  | 'section-header' | 'section-featured' | 'section-grid'
  | 'section-contact' | 'section-hero' | 'section-about' | 'section-slots'

interface StoreConfig {
  signature: StoreSignature
  layout: StoreLayout
  palette: StorePalette
  typography: StoreTypography
  card_style: CardStyle
  section_order: SectionKey[]
  section_states: SectionStates
  hero_image_url: string | null
  featured_item_ids: string[]
  about_text: string
  item_display_order: string[] | null
  store_type_config: StoreTypeConfig   // ← type-specific Architect settings
}

interface StoreTypeConfig {
  // Collector
  drop_banner_text: string | null
  sold_out_overlay_style: 'dim' | 'strikethrough' | 'badge'
  // Vendor
  window_banner_text: string | null
  preorder_cta_text: string
  // Host
  booking_cta_text: string
  calendar_format: 'week' | 'month'
  portfolio_density: 'compact' | 'medium' | 'airy'
  // Digital Creator
  catalogue_display: 'grid' | 'list'
  free_badge_style: 'pill' | 'corner' | 'none'
  // Studio
  portfolio_layout: 'masonry' | 'grid' | 'editorial'
  enquiry_form_fields: string[]
  package_card_style: 'full' | 'minimal'
}

interface Merchant {
  id: string
  owner_id: string
  display_name: string
  store_name: string
  handle: string
  store_type: StoreType
  whatsapp: string
  bio: string
  avatar_url: string | null
  social_links: { instagram: string | null; twitter: string | null; tiktok: string | null }
  initialized_at: string     // ISO
  last_active_at: string     // ISO
  store_open: boolean
  whatsapp_template: string | null
  store_config: StoreConfig
  verification_tier: 'unverified' | 'verified' | 'trusted'
  is_paused: boolean
  pause_message: string | null
  pause_return_date: string | null   // ISO date
  checkout_enabled: boolean
  holds_enabled: boolean
  hold_duration_hours: 2 | 6 | 12 | 24
  bank_account: { account_number: string; bank_name: string; account_name: string } | null
}
```

### `product.types.ts`

```typescript
type ProductStatus = 'live' | 'hidden' | 'sold_out'
type ProductType   = 'item' | 'service' | 'digital' | 'package' | 'menu_item'

interface ProductVariant {
  id: string
  label: string
  price_override: number | null   // null = use parent price
  stock_level: number
  status: ProductStatus
  display_order: number
}

interface Product {
  id: string
  merchant_id: string
  name: string
  description: string | null
  price: number                   // naira integers (NOT kobo)
  product_type: ProductType
  stock_level: number | null      // null when has_variants = true
  status: ProductStatus
  collection_id: string | null
  tags: string[]
  images: string[]
  has_variants: boolean
  variant_axis: string | null     // e.g. "Size", "Colour", "Quantity"
  variants: ProductVariant[] | null
  claim_mode: boolean
  claim_limit: number | null
  // Host/Studio fields
  duration: number | null         // minutes
  deposit_amount: number | null   // naira
  deposit_required: boolean
  // Digital Creator fields
  delivery_url: string | null
  is_free: boolean
  early_access_price: number | null
  early_access_cap: number | null
  // Studio fields
  price_type: 'fixed' | 'custom' | null
  scope_description: string | null
  deliverables: string | null
  timeline_estimate: string | null
  deposit_pct: number | null
  created_at: string
  updated_at: string
}

interface Collection {
  id: string
  merchant_id: string
  name: string
  color_accent: string
  display_order: number
  slug: string
  description: string | null
}
```

### `receipt.types.ts`

```typescript
type ReceiptType   = 'sale' | 'booking' | 'order' | 'download' | 'project'
type PaymentStatus = 'pending_payment' | 'paid' | 'cancelled'
type ShipmentStatus = 'not_started' | 'packed' | 'shipped' | 'received'
type PaymentMethod = 'bank_transfer' | 'cash' | 'opay' | 'palmpay' | 'moniepoint' | 'ussd' | 'other'

interface ReceiptLineItem {
  product_id: string | null
  name: string
  variant_label: string | null
  quantity: number
  unit_price: number
  total_price: number
}

interface ReceiptLogEntry {
  id: string
  event: string
  timestamp: string
  actor: 'merchant' | 'system' | 'buyer'
}

interface Receipt {
  id: string
  merchant_id: string
  seal_id: string
  receipt_type: ReceiptType
  buyer_name: string
  buyer_phone: string | null
  buyer_email: string | null
  line_items: ReceiptLineItem[]
  subtotal: number
  discount_amount: number
  discount: { type: 'flat' | 'percent'; value: number; applied_amount: number } | null
  delivery_fee: number | null
  total: number
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  shipment_status: ShipmentStatus
  notes: string | null
  log: ReceiptLogEntry[]
  is_quick_item: boolean
  created_at: string
  updated_at: string
}
```

### `store-config.types.ts` — CRITICAL: field names have caused past bugs

```typescript
// PALETTES shape — FLAT, no .preview nesting
interface PaletteDefinition {
  id: StorePalette
  name: string        // ← "name" NOT "label"
  bg: string          // ← "bg" NOT "preview.bg"
  surface: string     // ← "surface" NOT "preview.surface"
  accent: string      // ← "accent" NOT "preview.accent"
  fg: string
}

// LAYOUTS shape
interface LayoutDefinition {
  id: StoreLayout
  name: string        // ← "name" NOT "label"
  description: string
  cssClass: string    // e.g. 'layout-grid-dense'
}

// TYPOGRAPHY_STACKS shape — field names are "heading" and "body"
interface TypographyDefinition {
  id: StoreTypography
  name: string          // ← "name" NOT "label"
  heading: string       // ← "heading" NOT "headingFont"
  body: string          // ← "body" NOT "bodyFont"
  cssVars: Record<string, string>
}

// CARD_STYLES shape
interface CardStyleDefinition {
  id: CardStyle
  name: string
  description: string
  componentName: string
}

// SIGNATURES shape
interface SignatureDefinition {
  id: StoreSignature
  name: string          // ← "name" NOT "label"
  tagline: string       // ← "tagline" NOT "description"
  defaultPalette: StorePalette
  defaultLayout: StoreLayout
  defaultTypography: StoreTypography
  defaultCardStyle: CardStyle
  defaultSectionOrder: SectionKey[]
}
```

---

## Constants — IDs and Values

### PALETTES (src/lib/constants/palettes.ts)
| id | name |
|---|---|
| `'maroon'` | `'Grey Parchment'` |
| `'velvet'` | `'Velvet Maroon'` |
| `'parchment'` | `'Warm Parchment'` |
| `'slate'` | `'Cool Slate'` |
| `'onyx'` | `'Onyx'` |

### LAYOUTS (src/lib/constants/layouts.ts)
| id | name | cssClass |
|---|---|---|
| `'grid-dense'` | `'Dense Grid'` | `'layout-grid-dense'` |
| `'grid-airy'` | `'Airy Grid'` | `'layout-grid-airy'` |
| `'editorial'` | `'Editorial'` | `'layout-editorial'` |
| `'masonry'` | `'Masonry'` | `'layout-masonry'` |
| `'minimal'` | `'Minimal List'` | `'layout-minimal'` |

### TYPOGRAPHY_STACKS (src/lib/constants/typography.ts)
| id | name | heading | body |
|---|---|---|---|
| `'editorial'` | `'Editorial'` | `'Playfair Display'` | `'Inter'` |
| `'modern'` | `'Modern Sans'` | `'Inter'` | `'Inter'` |
| `'mono'` | `'Monospaced'` | `'DM Mono'` | `'DM Mono'` |
| `'warm'` | `'Warm Serif'` | `'Cormorant Garamond'` | `'Inter'` |
| `'bold'` | `'Bold Display'` | `'Playfair Display'` | `'Inter'` |

### CardStyle IDs — ONLY these are valid
`'clean-square'` · `'rounded-float'` · `'polaroid'` · `'film-strip'` · `'minimal-line'`

Previous invalid names that caused crashes: `'editorial'`, `'gallery'`, `'stamp'`, `'receipt'`, `'minimal'`

### SectionStates keys — ONLY these are valid
`'section-hero'` · `'section-about'` · `'section-slots'` · `'section-featured'`

`'section-header'`, `'section-grid'`, `'section-contact'` appear in `section_order` but are NOT in SectionStates (they are always visible, cannot be toggled).

### SIGNATURES (src/lib/constants/signatures.ts)
| id | name | tagline |
|---|---|---|
| `'the-bale'` | `'The Bale'` | `'Fresh from the bale. Curated for you.'` |
| `'the-vault'` | `'The Vault'` | `'Rare finds. Locked in.'` |
| `'the-atelier'` | `'The Atelier'` | `'Bespoke. Made for you.'` |
| `'the-archive'` | `'The Archive'` | `'Every piece has a story.'` |
| `'the-gallery'` | `'The Gallery'` | `'Objects of desire.'` |

---

## Zustand Stores — Full API

### `ui.store.ts` — `useUIStore`
```typescript
// State
toasts: Toast[]
isLoading: boolean
activeDrawer: string | null
activeModal: string | null
isPageLocked: boolean
loadingKey: string | null

// Actions
addToast(message: string, type?: 'success' | 'error' | 'info', duration?: number): void
removeToast(id: string): void
setLoading(key: string | null): void
setPageLocked(locked: boolean): void
openDrawer(id: string): void
closeDrawer(): void
openModal(id: string): void
closeModal(): void
```

### `terminal.store.ts` — `useTerminalStore`
```typescript
// State
stage: 'composition' | 'attribution' | 'issuance'
visorItems: VisorLineItem[]
buyerName: string
buyerPhone: string
discount: { expanded: boolean; type: 'flat' | 'percent'; value: number }
issuedReceipt: Receipt | null

// Computed (call as functions)
subtotal(): number
discountAmount(): number
total(): number

// Actions
addItem(product: Product, variant?: ProductVariant): void
removeItem(index: number): void
addQuickItem(name: string, price: number): void
clearVisor(): void
nextStage(): void
prevStage(): void
setBuyerName(v: string): void
setBuyerPhone(v: string): void
setDiscountExpanded(b: boolean): void
setDiscountType(t: 'flat' | 'percent'): void
setDiscountValue(n: number): void
setIssuedReceipt(receipt: Receipt): void
reset(): void
```

### `archive.store.ts` — `useArchiveStore`
```typescript
// State
products: Product[]
statusFilter: 'all' | ProductStatus
collectionFilter: string | null
searchQuery: string
ghostCards: GhostCard[]

// Computed
filteredProducts(): Product[]

// Actions
setStatusFilter(v: 'all' | ProductStatus): void
setCollectionFilter(v: string | null): void
setSearchQuery(v: string): void
setGhostCards(cards: GhostCard[]): void
updateGhostCard(id: string, patch: Partial<GhostCard>): void
removeGhostCard(id: string): void
clearGhostCards(): void
mintProducts(cards: GhostCard[]): void
toggleProductStatus(id: string): void
updateProduct(id: string, patch: Partial<Product>): void
```

### `ledger.store.ts` — `useLedgerStore`
```typescript
// State
receipts: Receipt[]
activeTab: 'all' | 'pending' | 'dispatch' | 'completed'
selectedReceiptId: string | null
selectedIds: string[]
isMultiSelectMode: boolean

// Computed
filteredReceipts(): Receipt[]

// Actions
setActiveTab(tab: string): void
setSelectedReceiptId(id: string | null): void
enterMultiSelectMode(firstId: string): void
exitMultiSelectMode(): void
toggleSelectId(id: string): void
selectAll(): void
markAsPaid(id: string, paymentMethod: PaymentMethod): void
markManyAsPaid(ids: string[], paymentMethod: PaymentMethod): void
markPacked(id: string): void
markShipped(id: string): void
markReceived(id: string): void
```

---

## Utilities — Function Signatures

### `format.ts`
```typescript
formatCurrency(amount: number): string             // 12000 → "12,000"
formatCurrencyFull(amount: number): string         // 12000 → "₦12,000"
formatDate(date: string, style: 'short' | 'long' | 'relative'): string
formatRelativeDate(date: string): string           // "3h ago", "Yesterday"
formatLastActive(isoString: string): string        // "Active today", "Updated 3 days ago"
formatSealId(sealId: string): string               // uppercase
formatPhone(phone: string): string                 // "08012345678"
truncate(text: string, maxLength: number): string  // adds "…"
```

### `whatsapp.ts`
```typescript
buildChatToBuyLink(params: {
  phone: string;
  itemName: string;
  price: number;
  variantLabel?: string;
  storeName: string;
  template?: string;
}): string

buildClaimConfirmLink(params: {
  phone: string;
  itemName: string;
  price: number;
  storeName: string;
}): string

buildStoreContactLink(phone: string, storeName: string): string
```

### `smart-paste.ts`
```typescript
parseSmartPaste(text: string): ParsedItem[]
// ParsedItem: { name, price, quantity, tags, variantHints }
// Never throws. Returns [] on unparseable input.
```

---

## Fixture Data — What Exists

### FIXTURE_MERCHANT (Collector type)
```
store_name: "Tola's Archive"
handle: 'tolasarchive'
store_type: 'collector'
whatsapp: '+2348012345678'
palette: 'maroon', layout: 'grid-dense', typography: 'editorial'
card_style: 'clean-square', signature: 'the-bale'
section_states: { 'section-hero': false, 'section-about': true,
                  'section-slots': false, 'section-featured': true }
featured_item_ids: ['product-001', 'product-003', 'product-007']
```

### FIXTURE_PRODUCTS (22 items)
- IDs: `product-001` through `product-022`
- Collections: `col-001` (Dresses), `col-002` (Tops & Sets), `col-003` (Bags)
- Status mix: `live`, `hidden`, `sold_out`
- 3 items with `claim_mode: true`: product-007, product-017, product-020
- 2 items with `stock_level ≤ 2`
- Price range: ₦3,500–₦120,000
- Some have `variants` array

### FIXTURE_RECEIPTS (15)
- IDs: `receipt-001` through `receipt-015`
- PaymentStatus mix: pending_payment, paid, cancelled
- ShipmentStatus mix: not_started, packed, shipped, received

### FIXTURE_CLAIMS (6)
- IDs: `claim-001` through `claim-006`
- Status mix: pending (4), accepted (1), declined (1)

---

## Routes — Current State

```
/auth
/onboarding/select-role
/onboarding/identity
/onboarding/store-type              ← Phase 2B (NEW)
/onboarding/setup-store

(MerchantShell <Outlet /> wraps all below)
/dashboard
/archive
/terminal
/ledger
/insights
/dispatch
/settings
/notifications
/schedule                           ← Phase 2E (NEW — Vendor + Host)
/bookings                           ← Phase 2E (NEW — Host + Studio)
/catalogue                          ← Phase 2D (NEW — Digital Creator only)

(Public — no MerchantShell)
/receipt/:receipt_id
/submit-receipt/:intent_id
/store/:handle/customize            ← before /store/:handle in route order
/store/:handle/item/:item_id
/store/:handle/c/:collection_slug
/store/:handle
/store/:handle/book                 ← Phase 2I (NEW — Host booking flow)

(Admin — profiles.role === 'admin')
/admin
/admin/stores
/admin/reports
/admin/verification
/admin/suspensions
/admin/receipts
```

---

## Design System — CSS Tokens

All tokens live in `src/styles/tokens.css`. Use them exclusively.

### Colors
```
--color-bg, --color-surface, --color-surface-raised, --color-surface-inset
--color-fg, --color-fg-secondary, --color-fg-muted, --color-fg-ghost
--color-accent, --color-accent-mid, --color-accent-glow
--color-gold, --color-gold-light, --color-gold-dim
--color-success, --color-warning, --color-error
```

### Shadows (Neumorphic)
```
--shadow-raise-sm   ← small raised card
--shadow-raise      ← standard raised card
--shadow-raise-lg   ← prominent raised element
--shadow-inset-sm   ← input default
--shadow-inset      ← active/pressed state
--shadow-inset-deep ← deep inset
```

### Typography
```
--font-serif:     'Playfair Display', Georgia, serif
--font-serif-alt: 'Cormorant Garamond', serif
--font-sans:      'Inter', -apple-system, sans-serif
--font-mono:      'DM Mono', 'Courier New', monospace
```

### Spacing (4px base scale)
`--space-1` (4px) through `--space-20` (80px)

### Border Radius
`--r-xs` (6px) · `--r-sm` (12px) · `--r-md` (18px) · `--r-lg` (24px) · `--r-xl` (32px) · `--r-pill` (50px) · `--r-full` (9999px)

### Timing
`--duration-instant` (80ms) · `--duration-fast` (150ms) · `--duration-normal` (250ms) · `--duration-slow` (400ms) · `--duration-ceremony` (700ms)

### Easing
`--ease-spring` · `--ease-out` · `--ease-standard`

### Z-index Scale
`--z-base` (0) · `--z-raised` (10) · `--z-dropdown` (100) · `--z-drawer` (200) · `--z-modal` (300) · `--z-toast` (400) · `--z-pagelock` (500)

### Layout
`--nav-height-mobile`: 72px · `--nav-height-desktop`: 64px · `--sidebar-width`: 240px

### Special
`--noise` — SVG data-URI noise texture, overlaid on every card surface at 35–45% opacity via `::before` pseudo-element

---

## Global Utility Classes (`src/styles/global.css`)

### Typography
`.t-display` · `.t-headline` · `.t-title` · `.t-subtitle` · `.t-body-lg` · `.t-body` · `.t-caps` · `.t-label` · `.t-mono`

### Text Effects
`.text-foil` · `.text-foil-maroon` · `.text-debossed`

### Layout Grid Classes (applied to storefront wrappers)
`.layout-grid-dense` · `.layout-grid-airy` · `.layout-editorial` · `.layout-masonry` · `.layout-minimal`

---

## Cards System (`src/styles/cards.css`)

Import as side-effect: `import '@/styles/cards.css'`

Apply card variant via class on the **grid wrapper** (not individual cards):
`.card-clean-square` · `.card-rounded-float` · `.card-polaroid` · `.card-film-strip` · `.card-minimal-line`

Individual cards use class `sf-card` on the `<Link>` element:
```html
<Link to="..." className="sf-card">
  <div className="sf-card-image"><img /></div>
  <div className="sf-card-body">
    <p className="sf-card-name">...</p>
    <p className="sf-card-price">...</p>
  </div>
  <!-- Optional status badges: -->
  <span className="sf-card-status sf-card-status-sold">Sold Out</span>
  <span className="sf-card-status sf-card-status-claim">Claim</span>
  <span className="sf-card-status sf-card-status-low">Low Stock</span>
</Link>
```

---

## Animation — Framer Motion

ALL imports come from `@/lib/motion`. Never import directly from `framer-motion`.

```typescript
import { m, AnimatePresence, Reorder, useDragControls, useAnimation,
         LazyMotion, motionFeatures } from '@/lib/motion'
```

Standard spring configs:
- Drawers/sheets: `{ type: 'spring', stiffness: 340, damping: 36 }`
- Shared elements (layoutId): `{ type: 'spring', stiffness: 400, damping: 38 }`
- Fade transitions: `{ duration: 0.18, ease: [0.32, 0, 0.16, 1] }`

---

## The Architect — CustomizePage Architecture

`CustomizePage` owns `draftConfig: StoreConfig` in local `useState`. Not Zustand.

Layer ID type: `type LayerId = 'palette' | 'layout' | 'typography' | 'card' | 'signature'`
Defined in `architect.types.ts` (breaks circular import between ArchitectShell ↔ LayerNav).

Layer components all receive: `{ draftConfig: StoreConfig, onUpdate: (patch: Partial<StoreConfig>) => void }`

LivePreview:
- Phone frame: 390×844px DOM, `transform: scale(0.45)`, `transform-origin: top center`
- Palette applied via inline CSS vars on the screen div (reads `PALETTES.find(p => p.id === draftConfig.palette)` → accesses `palette.bg`, `palette.surface`, `palette.accent` — FLAT, no `.preview`)
- Typography applied via `stack.heading` and `stack.body` (NOT `.headingFont`/`.bodyFont`)
- Section states accessed as `draftConfig.section_states['section-hero']` (quoted string key)

---

## Store Type System

Store type (`merchant.store_type`) is a first-class system primitive. It restructures:
- Archive item model and terminology
- Terminal Stage 1 flow
- Dashboard vitals, action desk, activity log
- MerchantShell nav visibility
- Public storefront sections and CTAs
- Ledger labels
- Insights metric cards

### Store Type Quick Reference

| Type | Item Called | Archive Route | Terminal Flow | Public CTA |
|---|---|---|---|---|
| `collector` | Item | `/archive` | Select from inventory | "Chat to Buy" / "Add to Bag" |
| `vendor` | Menu Item | `/archive` | Select from menu (window must be open) | "Pre-order" |
| `host` | Service | `/archive` | Select service + slot | "Book a Slot" |
| `digital_creator` | Product | `/catalogue` | Select from catalogue + buyer email | "Buy Now" / "Download Free" |
| `studio` | Package / Service | `/archive` | Select package or custom line | "Book Package" / "Request Quote" |

### `useStoreType()` Hook

Located at `src/lib/hooks/use-store-type.ts`. Returns:

```typescript
interface StoreTypeContext {
  type: StoreType
  isCollector: boolean
  isVendor: boolean
  isHost: boolean
  isDigital: boolean
  isStudio: boolean
  // Labels that adapt per type
  itemLabel: string          // "Item" | "Menu Item" | "Service" | "Product" | "Package"
  archiveLabel: string       // "Archive" | "Menu" | "Services" | "Catalogue" | "Services"
  receiptLabel: string       // "Receipt" | "Order" | "Booking" | "Purchase" | "Project"
  primaryCta: string         // "Chat to Buy" | "Pre-order" | "Book a Slot" | "Buy Now" | "Book Package"
}
```