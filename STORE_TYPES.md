# Trovéa — Store Type Adaptive Guide

This doc specifies exactly how every adaptive surface branches per store type.
Use this as the implementation reference for Phases 2C–2J.

---

## The `useStoreType()` Hook

Located at `src/lib/hooks/use-store-type.ts`. Every adaptive component imports this.

```typescript
import { useStoreType } from '@/lib/hooks/use-store-type';

function MyComponent() {
  const st = useStoreType();

  if (st.isVendor) { /* Vendor-specific render */ }
  if (st.isHost || st.isStudio) { /* Host + Studio shared render */ }
}
```

Returns `StoreTypeContext` (see `ARCHITECTURE.md` for full interface).

In Phase 1 (static), this reads from the active fixture merchant. A dev switcher in MerchantShell lets you toggle between all 5 fixture types during development.

---

## MerchantShell Nav — Visibility Rules

| Nav Item | Collector | Vendor | Host | Digital Creator | Studio |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Archive | ✓ | ✓ | ✓ | ✗ (→ Catalogue) | ✓ |
| Catalogue | ✗ | ✗ | ✗ | ✓ | ✗ |
| Terminal | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ledger | ✓ | ✓ | ✓ | ✓ | ✓ |
| Schedule | ✗ | ✓ | ✓ | ✗ | ✗ |
| Bookings | ✗ | ✗ | ✓ | ✗ | ✓ |
| Dispatch | ✓ | ✓ | ✗ | ✗ | ✗ |
| Insights | ✓ | ✓ | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ |

Nav label adaptations:
- Archive label: `st.archiveLabel` → "Archive" / "Menu" / "Services" / — / "Services"
- Ledger label: `st.receiptLabel + "s"` → "Receipts" / "Orders" / "Bookings" / "Purchases" / "Projects"

---

## Dashboard — Per-Type Module Specs

### Activation Checklist

| Store Type | Item 1 | Item 2 | Item 3 |
|---|---|---|---|
| Collector | Add 3+ items to Archive | Style your Trove | Share your store link |
| Vendor | Create your first menu window | Set availability + cap quantities | Share your store link |
| Host | Add 3+ services to your menu | Configure your calendar availability | Share your store link |
| Digital Creator | Upload your first digital product | Set up your catalogue | Share your store link |
| Studio | Add your portfolio gallery | Create 2+ service packages | Share your store link |

Checklist disappears permanently when all 3 items are checked. State stored in localStorage per handle.

### Vitals — Business Pulse

| Store Type | Metric 1 | Metric 2 |
|---|---|---|
| Collector | Total sales volume (₦) — sealed receipts today | Store traffic — views and "Chat to Buy" clicks |
| Vendor | Pre-orders taken — current window | Remaining capacity — items vs cap |
| Host | Bookings confirmed today | Next available slot |
| Digital Creator | Downloads today + revenue (₦) | Top-performing product today |
| Studio | Enquiries received today | Pending package bookings |

### Action Desk — Shortcuts

| Store Type | Primary | Secondary | Tertiary |
|---|---|---|---|
| Collector | New Sale → /terminal | Add Item → /archive | View Live Store |
| Vendor | Open Window → /schedule | Manage Pre-orders → /terminal | View Live Store |
| Host | View Bookings → /bookings | Manage Schedule → /schedule | View Live Store |
| Digital Creator | Upload Product → /catalogue | View Downloads → /ledger | View Live Store |
| Studio | View Enquiries → /bookings | Manage Packages → /archive | View Live Store |

### Activity Log — Event Language

| Store Type | Event | Example Entry |
|---|---|---|
| Collector | Item sold | "Silk camisole · ₦18,500 · Adunola" |
| Vendor | Pre-order placed | "Jollof rice × 2 · Pre-order 0041 · Tunde" |
| Host | Booking confirmed | "Wispy Lashes · Saturday 10am · Kemi — deposit paid" |
| Digital Creator | Download completed | "Brand Starter Kit · ₦12,000 · Bolu" |
| Studio | Enquiry received | "Brand shoot enquiry · Zara Foods · via package form" |

---

## Archive — Per-Type Item Models

### Collector (existing — `product_type: 'item'`)
Fields displayed: name, price, stock_level, images, collection, tags, claim_mode
Unique: Smart Paste; Drop scheduling tab; stock countdown on storefront

### Vendor (`product_type: 'menu_item'`)
Fields displayed: name, price, per-window quantity cap, images, category (not collection)
Unique: Smart Paste; cap resets per window; no stock concept

### Host (`product_type: 'service'`)
Fields displayed: name, duration (mins), price, deposit_amount, deposit_required toggle
Unique: Duration drives slot generation; no Smart Paste; inactive toggle (not delete)

### Digital Creator (`product_type: 'digital'` — in `/catalogue`, not `/archive`)
Fields displayed: name, price, is_free, preview_asset, delivery_url, delivery_method, early_access_price, early_access_cap
Unique: Private delivery asset split from preview; instant delivery; no stock

### Studio (`product_type: 'package'`)
Fields displayed: name, price_type (fixed/custom), scope_description, deliverables, timeline_estimate, deposit_pct, intake form fields
Unique: Custom quote path; per-package enquiry form builder

---

## Terminal — Per-Type Stage 1

### Stage 1: Item Selection

**Collector** — existing flow
- Inventory grid of live products
- Tap to add to Visor; expand for variants
- Quick Item button for ad-hoc items

**Vendor**
- Menu grid (only items in the current open window)
- Window must be open — if no open window: "No active window. Open a window in Schedule to start taking orders."
- Tap to add; shows per-window cap remaining for each item

**Host**
- Step 1: Select service from list
- Step 2: Select available slot from calendar view (slots computed from Schedule rules)
- Shows date + time + duration; unavailable slots greyed out

**Digital Creator**
- Catalogue grid of products
- After adding: prompt for buyer email (required for delivery)
- No stock checking needed

**Studio**
- Package list from Archive
- Option to "Create Custom Line" (name + price, like Quick Item)
- After selecting package: optional scope confirmation text field

### Stage 2: Attribution (Universal with Adaptations)

All types: buyer name (required) + buyer contact.

Buyer contact field adapts:
- Collector/Vendor/Host/Studio: WhatsApp number
- Digital Creator: Email address (required for delivery link)

Delivery Fee field:
- Show for: Collector, Vendor, Studio (optional)
- Label: "Delivery" for Collector/Vendor; "Travel fee" for Host; "Logistics" for Studio
- Hide for: Digital Creator (no physical delivery)

Discount field: universal across all types (collapsible, hidden by default).

### Stage 3: Issuance

Slide-to-confirm (or long-press). Atomically:
- **Collector**: INSERT receipt, DECREMENT stock_level
- **Vendor**: INSERT receipt, DECREMENT window_item_caps.sold
- **Host**: INSERT receipt + booking, UPDATE availability_slot status → 'booked'
- **Digital Creator**: INSERT receipt, TRIGGER delivery link → buyer email
- **Studio**: INSERT receipt, CREATE project record in Ledger

---

## The Seal (ReceiptPage) — Store-Type Labels

| Element | Collector | Vendor | Host | Digital Creator | Studio |
|---|---|---|---|---|---|
| Page heading | Receipt | Order Receipt | Booking Confirmation | Purchase Receipt | Project Brief |
| Issued by | Store name | Store name | Studio name | Creator name | Studio name |
| Item section | Items Purchased | Order Summary | Service Booked | Products Delivered | Package Scope |
| CTA | "View Store" | "Next Window" | "Book Again" | "Explore More" | "View Portfolio" |

Ledger entry labels:

| Element | Collector | Vendor | Host | Digital Creator | Studio |
|---|---|---|---|---|---|
| Entry label | Receipt | Order | Booking | Purchase | Project |
| Status: paid | Paid | Fulfilled | Confirmed | Delivered | Active |
| Status: pending | Pending | Pending | Pending | Pending | Pending |
| Status: cancelled | Cancelled | Cancelled | Cancelled | Refunded | Closed |
| Amount column | Total (₦) | Order total (₦) | Service fee (₦) | Purchase price (₦) | Package value (₦) |

---

## Storefront — Sections Availability

| Section | Collector | Vendor | Host | Digital Creator | Studio |
|---|---|---|---|---|---|
| Store Header | ✓ always | ✓ always | ✓ always | ✓ always | ✓ always |
| Hero Banner | optional | optional | optional | optional | optional |
| Drop Countdown | ✓ | ✗ | ✗ | ✗ | ✗ |
| Window Status + Menu | ✗ | ✓ | ✗ | ✗ | ✗ |
| Featured Items | ✓ | ✗ | ✗ | ✓ | ✗ |
| Product Grid | ✓ | ✗ | ✗ | ✓ | ✗ |
| Service Menu + Booking CTA | ✗ | ✗ | ✓ | ✗ | ✓ |
| Calendar Availability Preview | ✗ | ✗ | ✓ | ✗ | ✗ |
| Portfolio Gallery | ✗ | ✗ | optional | ✗ | ✓ |
| Digital Catalogue | ✗ | ✗ | ✗ | ✓ | ✗ |
| About / Story | optional | optional | optional | optional | optional |
| Enquiry Form | ✗ | ✗ | ✗ | ✗ | ✓ |
| Contact Strip | optional | optional | optional | optional | optional |

The "core commerce section" per type **cannot be hidden** (no toggle in Architect):
- Collector: Product Grid
- Vendor: Window Status + Menu
- Host: Service Menu
- Digital Creator: Digital Catalogue
- Studio: Service Packages

---

## Storefront — Purchase CTAs

| Store Type | CTA Label | Action |
|---|---|---|
| Collector | "Chat to Buy" | WhatsApp deeplink with item details |
| Collector (Checkout ON) | "Claim" | Claim sheet with bank transfer flow |
| Collector (Bag) | "Add to Bag" | Adds to session bag |
| Vendor | "Pre-order" | Adds to pre-order; Curator confirms |
| Host | "Book a Slot" | Opens booking flow: select slot → confirm → deposit |
| Digital Creator (paid) | "Buy Now" | Checkout → Seal → delivery link to email |
| Digital Creator (free) | "Download Free" | Instant delivery without payment |
| Studio (fixed) | "Book Package" | Deposit flow |
| Studio (custom) | "Request Quote" | Opens enquiry form → routes to Curator |

---

## Insights — Per-Type Cards

### Universal (all types)
- **The Pulse**: revenue/volume in selected window vs prior period. Large number, trend arrow (↑↓).
- **Log Preview**: last 5 transactions/bookings with type-appropriate labels.

### Type-Specific Cards

| Store Type | Card 2 | Card 3 |
|---|---|---|
| Collector | Item Heatmap: most clicked vs converted. "High Interest, No Sale" flagged. | Inventory Health: items >30 days old + no clicks in 7 days = Stagnant. |
| Vendor | Window Performance: sell-through rate per window. Consistently unsold items flagged. | Peak Demand: items that sell out fastest — informs cap-setting. |
| Host | Booking Rate: confirmed vs cancelled vs no-show ratio. High no-show services flagged. | Schedule Efficiency: % of available slots filled per week. Most in-demand time windows. |
| Digital Creator | Product Performance: downloads + revenue per product. Top seller badge. | Delivery Health: failed delivery link checks; zero-download products since publish. |
| Studio | Enquiry Conversion: enquiries received vs packages booked. Drop-off point flagged. | Pipeline Value: total value of confirmed + pending packages in current period. |

---

## Architect — Store-Type-Specific Controls (6th Layer)

Added as a "Store Settings" layer in The Architect, only visible/relevant fields shown per type.

### Collector
- Featured items picker (drag-to-reorder, up to 4 items selected from live inventory)
- Drop announcement banner text (shown as a strip above the header during an upcoming drop)
- "Sold Out" overlay style: `dim` / `strikethrough` / `badge`

### Vendor
- Window announcement banner text (shown in Dormant state — "New window coming Saturday!")
- Menu category display order (drag-to-reorder the category tabs)
- Pre-order CTA text (default: "Pre-order"; can be "Order Now", "Reserve", etc.)

### Host
- Booking CTA text (default: "Book a Slot"; can be "Book Now", "Reserve a Slot", etc.)
- Calendar display format: `week` (7-day week view) / `month` (monthly calendar)
- Portfolio grid density: `compact` / `medium` / `airy`

### Digital Creator
- Catalogue display: `grid` (card grid) / `list` (horizontal list rows)
- Preview asset display style: `card` (standard card) / `feature` (large featured card)
- Free product badge style: `pill` (text pill) / `corner` (corner ribbon) / `none`

### Studio
- Portfolio layout: `masonry` / `grid` / `editorial` (large hero + grid)
- Enquiry form fields (toggleable checklist): event_type, date, deliverable_count, reference_links, budget_range, location, additional_notes
- Package card style: `full` (shows all scope details) / `minimal` (name + price + CTA only)

---

## Settings — Per-Type Sections

Settings sections that only appear for certain store types:

| Setting Section | Collector | Vendor | Host | Digital Creator | Studio |
|---|---|---|---|---|---|
| Trovéa Checkout (bank details) | ✓ | ✓ | ✓ | ✗ | ✓ |
| Hold System | ✓ | ✓ | ✗ | ✗ | ✗ |
| Cancellation Policy | ✗ | ✗ | ✓ | ✗ | ✓ |
| Location / Address | ✗ | ✗ | ✓ | ✗ | ✓ |
| Digital Delivery (email config) | ✗ | ✗ | ✗ | ✓ | ✗ |

---

## The Bag — Which Types Support It

The Bag (multi-item buyer experience) applies to:
- ✓ **Collector** — "Add to Bag" as primary CTA
- ✓ **Vendor** — "Add to Bag" (within the current open window)
- ✓ **Digital Creator** — "Add to Bag" (unlimited items)
- ✗ **Host** — slot booking is not a "bag" item; uses dedicated booking flow
- ✗ **Studio** — enquiries are not bag items; uses enquiry form

---

## Trovéa Checkout (Claims) — Which Types Support It

| Store Type | CTA (Checkout OFF) | CTA (Checkout ON) |
|---|---|---|
| Collector | "Chat to Buy" | "Claim" (primary) + "Add to Bag" (secondary) |
| Vendor | "Pre-order" | "Claim Pre-order" — same flow, window-scoped |
| Host | "Book a Slot" (WhatsApp) | "Book & Pay Deposit" — Claim flow with slot_id |
| Digital Creator | "Buy Now" / "Download Free" | N/A — instant delivery model incompatible |
| Studio | "Book Package" / "Request Quote" | "Book & Pay Deposit" for fixed packages only |

---

## Drop Announcements — Smart Default Headlines

| Store Type | Trigger | Default Headline |
|---|---|---|
| Collector | Drop going live | "New drop. [X] pieces. [Day] [time]." |
| Vendor | Window opening | "We're open [Day]. [X] items on the menu." |
| Host | New slots available | "[X] slots just opened. [Service name]." |
| Digital Creator | New product published | "Now available: [Product name]." |
| Studio | New package added | "Now available: [Package name]." |

---

## Urgency Signals — Per Type

| Signal | Trigger | Display | Store Type |
|---|---|---|---|
| "Only X left" | stock_level ≤ 3 | Below item name on card | Collector |
| "X of Y remaining" | window cap - sold < 5 | On menu card | Vendor |
| "X slots left this week" | available slots ≤ 3 in next 7 days | On Host storefront header | Host |
| "Selling fast" | ≥ 3 bag adds in last 2 hours | Small badge on card (no number) | Collector |
| "Closes in X hours" | window close_at within 6 hours | Banner at top of storefront | Vendor |

Rules:
- All signals derived from real data — never manually set by Curator
- Amber/copper tones only — never red (red = error, not urgency)
- Signals disappear automatically when conditions no longer met