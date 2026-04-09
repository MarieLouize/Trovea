# Trovéa — Refinement Phases: "The Complete Store"

> These phases transform Trovéa from a functional mockup into a finished product where every buyer flow is completable end-to-end and every store type earns return visits. Each phase is atomic — it can ship independently. Tasks marked **[foundation]** must complete before anything that depends on their output.
>
> **Audit basis:** Full review of StorefrontPage, ItemDetailPage, basket.store.ts, ClaimSheet, InquiryBasket, and all per-type rendering branches conducted April 2026.
>
> **Constraints in force:**
> - No AI/ML features
> - No actual fund movement or payment processing in V1
> - All decisions made upfront — no design-by-committee during execution

---

## Audit Findings — Critical Friction Points

Before the phases, the problems they fix:

### 1. The Bag → Checkout Disconnect (affects Collector, Vendor, Digital Creator)
`InquiryBasket` always outputs "Place Order via WhatsApp" regardless of store type or checkout settings. When `checkout_enabled === true` on a merchant, there is no "Claim All" option in the basket — ClaimSheet only accepts a single `Product`. A buyer who adds 3 Collector items to their bag and wants to pay via bank transfer must either: WhatsApp the seller (fragmented), or Claim each item individually (tedious). There is no unified multi-item checkout path.

For Digital Creator, the basket is doubly broken: the WhatsApp CTA is the wrong channel entirely — digital delivery is email-based. A buyer adding 3 digital products to their bag has no correct checkout path.

### 2. Vendor — No Product Detail Browsing
`MenuDisplay` renders flat rows with per-item "Pre-order" buttons that open individual WhatsApp links. Menu items are not linked to `ItemDetailPage`. Buyers cannot see product images, full descriptions, or add multiple items to a single bundled pre-order. When the window is closed, the `MenuDisplay` is hidden entirely — buyers cannot browse the menu to plan for the next window. The entire vendor storefront becomes a dead end when closed.

### 3. Host — ItemDetailPage Booking CTA Is Broken
`ItemDetailPage` for Host stores shows a "Book a Slot" CTA as `<a href="/store/${handle}/book">` — a hardcoded generic URL that loses all service context. The correct slot picker (`openSlotPicker(product)`) exists on `StorefrontPage` but is unreachable from `ItemDetailPage`. Similarly, the `CalendarPreview` component's "Book →" links go to the same generic URL, discarding the selected date and time slot context.

### 4. Digital Creator Catalogue — No "Add to Bag" on Cards
`DigitalProductCard` has no bag button — buyers must navigate to `ItemDetailPage` to add each item. This is friction for catalogue browsing. A buyer who wants 3 digital products must visit 3 separate detail pages just to queue items before the checkout (which is also broken per finding 1).

### 5. Studio — No Deposit Booking Path
Studio fixed-price packages show a "Book a Call" CTA that links to `/store/${handle}/book` (broken generic URL). There is no deposit booking flow. The `ClaimSheet` / `HoldSheet` system exists but is not connected to Studio packages. Buyers who want to commit to a Studio package have no way to do so through the product — they must go to WhatsApp.

### 6. Post-Purchase Discovery Is Thin
`ReceiptPage` has a "View Store" CTA but no item suggestions. `ItemDetailPage` has a "More from [store]" grid (which is correctly implemented) but filters only by `status !== 'hidden'` — it doesn't prioritize same-collection items. There is no way to follow a store for updates without a drop being active.

---

## Phase Priority Order

Phases execute in this order if time is limited:

1. **3A** — token hygiene (foundation for all visual work)
2. **3B** — multi-item bag checkout (highest buyer friction point)
3. **3C** — vendor browsable menu (largest gap in a full store type)
4. **3D** — host booking flow completeness
5. **3E** — digital catalogue bag + email checkout
6. **3F** — studio deposit booking
7. **3G** — discovery & return visit hooks
8. **3H** — motion & ceremony
9. **3I** — loading states
10. **3J** — operational flows (Curator-side)
11. **3K** — typography & numbers
12. **3L** — language & copy
13. **3M** — public storefront polish
14. **3N** — zero states

---

## Phase 3A — Token & CSS Hygiene
**Goal:** Every automated check in QUALITY.md Part VII passes. Foundation for all visual work.

### A1. Token updates `[foundation]`
File: `src/styles/tokens.css`

1. Add `--duration-enter: 600ms` after `--duration-slow`
2. Update `--duration-ceremony: 700ms` → `900ms`

### A2. Fix `.animate-in` stagger class
File: `src/styles/global.css`

`.animate-in` uses `var(--duration-ceremony)` — wrong. Change:
`animation: fadeUp var(--duration-ceremony)` → `animation: fadeUp var(--duration-slow)`

### A3. Add missing utility classes
File: `src/styles/global.css`

Add after the touch target section:
```css
.btn-icon { min-width: 44px; min-height: 44px; padding: 0; display: inline-flex; align-items: center; justify-content: center; }
.t-title, .t-subtitle, .t-headline { text-wrap: balance; }
.t-mono, .price, .t-price { font-variant-numeric: tabular-nums; white-space: nowrap; }
.t-stat-number { font-family: var(--font-serif); font-variant-numeric: oldstyle-nums; }
.surface-amber {
  background: linear-gradient(145deg, var(--color-surface-raised), var(--color-surface));
  box-shadow: var(--shadow-raise-sm), 0 0 0 1px var(--color-gold-dim);
  border-radius: var(--r-md);
}
```

### A4. Fix `.neu-velvet` hardcoded shadows
File: `src/styles/global.css`

Replace hardcoded `box-shadow: 10px 10px 24px #190002, -6px -6px 16px rgba(255,255,255,0.06)`:
```css
.neu-velvet {
  background: linear-gradient(145deg, var(--color-surface-raised), var(--color-surface));
  box-shadow: var(--shadow-raise);
  border-radius: var(--r-md);
}
```

### A5. Fix hardcoded shadows in button variants
File: `src/styles/global.css`

- `.btn--primary`: `box-shadow: 6px 6px 16px rgba(57, 0, 7, 0.4)` → `box-shadow: 6px 6px 16px var(--color-accent-glow)`
- `.btn--whatsapp`: define `--color-whatsapp-glow: rgba(37, 211, 102, 0.25)` in root, reference it

### A6. Fix hardcoded shadows in `cards.css`
File: `src/styles/cards.css`

- Line ~211 (basket btn): `box-shadow: 0 2px 8px rgba(0,0,0,0.12)` → `box-shadow: var(--shadow-raise-sm)`
- All card variant hardcoded shadows → `var(--shadow-raise)` or `var(--shadow-inset-sm)` as appropriate

### A7–A8. Fix hardcoded shadows in page CSS files
Files: `SelectRolePage.module.css`, `AuthPage.module.css`

- `rgba(57, 0, 7, 0.*)` → `var(--color-accent-glow)` based
- `rgba(201, 168, 76, 0.*)` → `var(--color-gold-dim)` based
- Generic Google-style shadows → `var(--shadow-raise-sm)` or `none`

### A9. Fix hardcoded hex colors in component CSS files
Files: `MerchantShell.module.css`, `Toast.module.css`, `GuideMarker.module.css`, `DropCardGenerator.module.css`, `ArchitectShell.module.css`, `ClaimSheet.module.css`, `HoldSheet.module.css`, `CardStyleLayer.module.css`, `SignatureLayer.module.css`, `AdminShell.module.css`

- `#F0EDE8` → `var(--color-fg)` (velvet context)
- `#390007`, `#5C0010` → `var(--color-accent)` or `var(--color-accent-mid)`
- `#C9A84C`, `#E2C97E` → `var(--color-gold)` or `var(--color-gold-light)`
- `#1A1208` → `var(--color-fg)` (gold/ivory context)
- `#350006` → `var(--color-surface)` (velvet palette)

### A10. Fix language violations
Files: `AuthPage.tsx`, `NotificationsPage.tsx`, `FirstItemPage.tsx`

- `AuthPage.tsx:66`: `'Successfully signed in'` → `'Signed in'`
- `AuthPage.tsx:62`: `'Invalid code — please try again'` → `'That code doesn\'t match. Check your email and try again.'`
- `NotificationsPage.tsx`: `'No unread notifications.'` → `'You\'re up to date.'`
- `FirstItemPage.tsx`: `'Failed to create your store. Please try again.'` → `'Couldn\'t create your store. Check your connection and try again.'`

---

**Phase 3A done when:** `grep -r "box-shadow:" src/ | grep -v "var(--shadow"` and `grep -rE "#[0-9a-fA-F]{3,6}" src/components src/pages --include="*.css"` both return zero results (excluding token definition file).

---

## Phase 3B — The Bag: Multi-Item Checkout
**Goal:** Buyers who add multiple items to the bag can complete checkout in one flow — Claim, WhatsApp, or email — without fragmentation. This is the highest-priority buyer friction fix.

### B1. Extend basket store with merchant context `[foundation]`
File: `src/lib/store/basket.store.ts`

Add to `BasketStore` interface and initial state:
```ts
merchantId: string | null;
merchantHandle: string | null;
storeType: string | null;  // 'collector' | 'vendor' | 'digital_creator' | etc.
checkoutEnabled: boolean;

setMerchantContext: (id: string, handle: string, type: string, checkoutEnabled: boolean) => void;
```

Implement `setMerchantContext` as `set({ merchantId: id, merchantHandle: handle, storeType: type, checkoutEnabled })`.

Call `setMerchantContext` in `StorefrontPage` and `ItemDetailPage` in a `useEffect` on mount (after merchant is resolved). This ensures the basket always knows which store it belongs to.

**Bag isolation rule:** when `setMerchantContext` is called with a different `merchantId` than the current one and `items.length > 0`, call `clear()` first. A buyer cannot mix items from different stores.

### B2. Multi-item ClaimSheet `[foundation]`
File: `src/components/public/ClaimSheet/ClaimSheet.tsx`

Extend `ClaimSheetProps` to support basket mode:
```ts
// Existing single-item mode (unchanged):
product: Product;
variantLabel?: string | null;

// New basket mode — pass one or the other, never both:
basketItems?: import('@/lib/store/basket.store').BasketItem[];
```

**Render logic:**
- If `basketItems` is provided: step 1 shows an itemized summary of all basket items (name, qty, price), total at bottom, then bank transfer details for the full total. Step 2 collects buyer name + phone. Step 3 confirmation.
- If only `product` is provided: existing single-item flow unchanged.
- The step 3 WhatsApp confirmation message (built via `buildClaimConfirmLink`) must include all items when in basket mode.

Add `buildMultiItemClaimConfirmLink` to `src/lib/utils/whatsapp.ts`:
```ts
export function buildMultiItemClaimConfirmLink(
  phone: string,
  items: BasketItem[],
  storeName: string,
  buyerName: string,
  sealCode: string,
): string
```
Formats as: `"[storeName] — I've claimed [N] items (Seal: [code])\n[item list]\nTotal: ₦[total]\nName: [buyerName]"`

### B3. InquiryBasket CTA logic `[depends on B1, B2]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — `InquiryBasket` component

Replace the single "Place Order via WhatsApp" CTA with conditional logic:

```tsx
const { storeType, checkoutEnabled, items, ...rest } = useBasketStore();

// Digital Creator: email checkout path
if (storeType === 'digital_creator') {
  // Primary: "Buy All" → opens DigitalCartCheckoutDrawer (Phase 3E)
  // Fallback: "Or chat on WhatsApp" (secondary, ghost button)
}

// Collector/Vendor with Checkout ON: Claim path
if (checkoutEnabled && (storeType === 'collector' || storeType === 'vendor')) {
  // Primary: "Claim All" → opens multi-item ClaimSheet (B2)
  // Secondary: "Place Order via WhatsApp" (ghost button, existing logic)
}

// Default (Collector/Vendor checkout OFF, or other types):
// "Place Order via WhatsApp" (existing logic, unchanged)
```

The `[claimSheetOpen, setClaimSheetOpen]` state and the multi-item ClaimSheet must be rendered inside `InquiryBasket` itself (or lifted to `StorefrontPage` and passed down). Pass `basketItems={items}` to ClaimSheet.

### B4. Bag icon shows item count on ItemDetailPage
File: `src/pages/public/ItemDetailPage.tsx`

When `inBasket === true`, the "In Bag" button should show the bag count: `"In Bag (3)"`. This communicates to the buyer that there are multiple items queued. Tapping it does NOT remove the item — it navigates back to the storefront and opens the basket. Use `useNavigate` + `useBasketStore().open()` for this behavior instead of the current toggle/remove behavior.

**Rationale:** Once an item is in the bag, the buyer's intent is to keep it there. Removing via the detail page is an accident waiting to happen. The action on the button changes from "remove" to "view bag."

### B5. Bag clear on store navigation
File: `src/lib/store/basket.store.ts`

Add `clearIfDifferentStore(incomingMerchantId: string): void` action. Called in `StorefrontPage` and `ItemDetailPage` on mount. If `merchantId !== incomingMerchantId` and `items.length > 0`: clear and reset merchant context. This prevents cross-store bag contamination.

---

**Phase 3B done when:** A Collector with 3 items in their bag can complete a Claim checkout for all 3 items in a single ClaimSheet flow. A Digital Creator buyer with 3 items in their bag sees a correct email-based checkout CTA (not WhatsApp). A Vendor buyer's bag correctly sends a bundled pre-order WhatsApp message.

---

## Phase 3C — Vendor: Browsable Menu & Pre-Order Bag
**Goal:** Buyers can browse the full vendor menu at any time (even when the window is closed), see product images and descriptions, add multiple items to a bag, and place a single bundled pre-order.

### C1. MenuDisplay → ItemDetailPage links `[foundation]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — `MenuDisplay` component

Each menu item row becomes a `<Link to="/store/${merchant.handle}/item/${item.id}">` wrapper around the item info block (name, description, price). The row layout:

```
[Image thumbnail 48×48] [Name + description + cap remaining] [Price] [Add to Bag btn]
```

**Image thumbnail:** render `<img src={item.images[0] ?? fallback} className={sfStyles.menuItemThumb} />` — 48×48px, `border-radius: var(--r-sm)`, `object-fit: cover`.

**"Add to Bag" button:** replaces the existing individual "Pre-order" WhatsApp link. Calls `basket.add({ id, name, price, image })`. Button uses `.btn.btn--neu.btn--sm`. When item is in basket: shows a checkmark with `.btn--primary` variant.

**Pre-order CTA text:** can be overridden by `merchant.store_config.store_type_config.preorder_cta_text` (from Architect StoreLayer). Default: `"Add to Bag"`.

### C2. Vendor closed-window browsing `[depends on C1]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — Vendor section

When `windowState !== 'open'`, show the menu in a "preview" state instead of hiding it:
- All items are visible with their images, names, and prices
- The bag button is replaced with a "Available next window" label (DM Mono, 9px, ghost)
- If `nextWindow` exists, show a chip above the grid: "Pre-orders open [formatted date]"
- A "Remind me on WhatsApp" link (builds `buildVendorNotifyLink()` in whatsapp utils) opens WhatsApp with message: `"Hi [storeName], remind me when your next window opens 🍽️"`

**New utility in `src/lib/utils/whatsapp.ts`:**
```ts
export function buildVendorNotifyLink(phone: string, storeName: string): string
```

### C3. Vendor ItemDetailPage full implementation `[depends on C1]`
File: `src/pages/public/ItemDetailPage.tsx`

For `st.isVendor`:
- Gallery: show full product images (existing gallery component, no change)
- Price row: add cap remaining chip if `item.stock_level !== null`: `"[N] remaining this window"` — `.badge--limited` style when > 5, `.badge--claim` style (amber) when ≤ 5
- CTA when window open: "Add to Bag" (primary) + "Chat to Buy" (secondary, WhatsApp)
- CTA when window closed: "Window closed" disabled button (primary) + "Notify me when open" (WhatsApp link, secondary)
- The existing `isPaused` check already handles the disabled state — refine the copy to show window-specific messaging

### C4. Vendor bag → bundled pre-order message `[depends on B1]`
File: `src/lib/store/basket.store.ts`

Add `buildVendorPreOrderWhatsApp()` that formats items as a pre-order:
```
*PRE-ORDER: [storeName]*
---
1. [Item] (x[qty]) — ₦[price]
2. [Item] — ₦[price]

Order Total: ₦[total]
Pickup: [fulfillment type]

Confirming my pre-order for the next window.
```

In `InquiryBasket`, detect `storeType === 'vendor'` and use this builder instead of `buildBasketWhatsApp`.

---

**Phase 3C done when:** A Vendor buyer can browse the full menu with images when the window is open or closed, add multiple items to the bag, and submit a single bundled pre-order WhatsApp message.

---

## Phase 3D — Host: Service Detail & Complete Booking Flow
**Goal:** Buyers can explore Host services in detail before booking. The slot selection preserves service context all the way to booking confirmation. ItemDetailPage and StorefrontPage use the same slot picker.

### D1. Extract BookingRequestSheet component `[foundation]`
File: `src/components/public/BookingRequestSheet/BookingRequestSheet.tsx` (new)

Extract the slot picker drawer from `StorefrontPage` (currently inline `BaseDrawer` with `slotPickerDrawer` content) into a standalone component.

Props:
```ts
interface BookingRequestSheetProps {
  open: boolean;
  onClose: () => void;
  service: Product;           // the specific service being booked
  merchant: Merchant;
  preselectedDate?: string;   // ISO date string — from CalendarPreview
  preselectedTime?: string;   // "HH:MM"
}
```

Internal steps: `'date' | 'time' | 'confirm'`. The `confirm` step shows:
- Service name + price
- Selected date + time
- Deposit amount (computed from `service.deposit_amount || service.price * (service.deposit_pct / 100)`)
- Buyer name + phone fields
- "Send Booking Request" → `buildBookingRequestLink()` → opens WhatsApp → `onClose()`

After calling `window.open(waLink)`, emit `addToast("Booking request sent. [merchant.store_name] will confirm shortly.")`.

**Create:** `src/components/public/BookingRequestSheet/index.ts` (re-export)

### D2. Replace slot picker in StorefrontPage `[depends on D1]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx`

Remove the inline slot picker `BaseDrawer`. Replace with `<BookingRequestSheet open={slotDrawerOpen} onClose={...} service={slotDrawerService!} merchant={merchant} />`. All existing state (`slotDrawerOpen`, `slotDrawerService`, `selectedDate`, `selectedTime`, `bookingForm`, `slotStep`) moves into `BookingRequestSheet` internally. Remove the now-unused state from `StorefrontPage`.

### D3. Host service cards → ItemDetailPage + service images `[depends on D1]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — Host service section

Each service card (`sfStyles.serviceCard`) becomes a link to `/store/${handle}/item/${p.id}`. The "Book a Slot" button within the card calls `openSlotPicker(p)` via `e.preventDefault()` + `e.stopPropagation()` (so clicking the button opens the picker but clicking the card navigates to detail).

Service card layout enhancement:
```
[Service image — if available, 80×80 thumbnail] [Name] [Duration · Deposit] [Price] [Book a Slot btn]
```

Image thumbnail: `<img src={p.images[0] ?? fallback} />` in `sfStyles.serviceCardThumb` — 80×80, rounded, same column as existing layout.

### D4. Host ItemDetailPage — BookingRequestSheet integration `[depends on D1]`
File: `src/pages/public/ItemDetailPage.tsx`

For `st.isHost`, replace:
```tsx
<a href={`/store/${handle}/book`} className={...}>
  <Calendar size={16} />
  Book a Slot
</a>
```

With:
```tsx
<button
  className={`${styles.actionBtn} ${styles.ctaPrimary}`}
  onClick={() => setBookingSheetOpen(true)}
>
  <Calendar size={16} />
  Book a Slot
</button>
```

Add `[bookingSheetOpen, setBookingSheetOpen] = useState(false)` state.

Render `<BookingRequestSheet open={bookingSheetOpen} onClose={() => setBookingSheetOpen(false)} service={product} merchant={merchant} />` at the bottom of the page (before ClaimSheet).

### D5. CalendarPreview → BookingRequestSheet with slot context `[depends on D1]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — `CalendarPreview` component

CalendarPreview currently renders a `BaseDrawer` with slot times, and each available time shows `<Link to={...}/book}>Book →</Link>`.

Change: replace `CalendarPreview`'s internal slot booking with a callback:
```tsx
interface CalendarPreviewProps {
  merchantId: string;
  handle: string;
  onBookSlot: (date: string, time: string) => void;  // new
}
```

In `StorefrontPage`, pass `onBookSlot={(date, time) => { setSlotDrawerService(liveProducts[0]); setSlotDrawerOpen(true); /* pass preselectedDate and preselectedTime to BookingRequestSheet */ }}`. If multiple services exist, the picker opens to service selection first.

**Note:** This requires `BookingRequestSheet` to accept optional `preselectedDate`/`preselectedTime` props (already specified in D1).

---

**Phase 3D done when:** A Host buyer can view service details on ItemDetailPage, open the slot picker with service context intact, complete the date/time/confirm flow, and submit a booking request via WhatsApp. The CalendarPreview slot "Book" action also feeds into the same unified flow.

---

## Phase 3E — Digital Creator: Catalogue Bag & Email Checkout
**Goal:** Digital Creator has "Add to Bag" on catalogue cards without requiring ItemDetailPage visits. The bag has an email-based checkout path for paid items and an instant free flow for free items.

### E1. Add bag button to DigitalProductCard `[foundation]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — `DigitalProductCard` component

Add a bag button to the card footer, aligned right:

```tsx
const { add, has } = useBasketStore();
const inBag = has(product.id);

<button
  className={`${sfStyles.digitalBagBtn} ${inBag ? sfStyles.digitalBagAdded : ''}`}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    add({ id: product.id, name: product.name, price: product.is_free ? 0 : product.price, image: product.images[0] ?? '' });
  }}
  aria-label={inBag ? 'In bag' : 'Add to bag'}
>
  {inBag ? <Check size={12} /> : <Plus size={12} />}
</button>
```

For free items: `add()` with `price: 0`. The bag total correctly shows ₦0 for free items, and they appear in the checkout with "Free" label.

### E2. DigitalCartCheckoutDrawer component `[foundation]`
File: `src/components/public/DigitalCartCheckoutDrawer/DigitalCartCheckoutDrawer.tsx` (new)

This is the email-based multi-item checkout for Digital Creator. Rendered inside `InquiryBasket` when `storeType === 'digital_creator'` and the "Buy All" CTA is tapped.

Props:
```ts
interface DigitalCartCheckoutDrawerProps {
  open: boolean;
  onClose: () => void;
  items: BasketItem[];
  merchant: Merchant;
}
```

**Internal steps:**

`'summary'` — shows itemized list. Free items labeled "Free". Paid items show price. Total (excluding free). Bank transfer details (`merchant.bank_account`) shown if total > 0. CTA: "I've Paid — Continue →" (paid) or "Get My Files →" (all free).

`'details'` — collect buyer name + email (required). Optional: reference note (for paid). Hint: "Your download link will arrive at this email." CTA: "Send Me the Files →".

`'confirmation'` — shows confirmation state: "Your request is in. [merchant.store_name] will verify your payment and send your files to [email] shortly." (paid) or immediate redirect to receipt mock (free). CTA: "Done".

For the paid confirmation step, open WhatsApp with the reference in the background (same pattern as `PaymentProofModal`) so the merchant sees proof, then show the in-app confirmation.

### E3. InquiryBasket — digital checkout path `[depends on E2, B1]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — `InquiryBasket`

When `storeType === 'digital_creator'`:
- Primary CTA: "Buy All →" (`.btn.btn--primary.btn--block`) → opens `DigitalCartCheckoutDrawer`
- If all items are free: CTA text is "Get Free Files →"
- Remove the existing WhatsApp CTA for digital stores
- Keep "Clear Bag" button

Render `<DigitalCartCheckoutDrawer open={digitalCheckoutOpen} ... />` at the bottom of `StorefrontPage`.

### E4. Free item instant path
File: `src/pages/public/ItemDetailPage.tsx`

For free digital items (`product.is_free === true`), the "Get Free" CTA on ItemDetailPage should open the `DigitalAcquisitionDrawer` immediately at the `'form'` step (email only), not the `'start'` step. The `'start'` step (payment instructions) is irrelevant for free items. This is already implemented via `useState('form')` when `product.is_free` — verify it's working correctly and that the hint text reads "We'll send your download link right away."

---

**Phase 3E done when:** A Digital Creator buyer can add 3 catalogue items to the bag without visiting ItemDetailPage for each, open a single checkout flow, provide their email, and get confirmation that their files will arrive.

---

## Phase 3F — Studio: Package Detail & Deposit Booking
**Goal:** Studio fixed-price packages have a complete deposit booking flow from browse → detail → deposit. Custom-quote packages have a structured enquiry that pre-fills from package context.

### F1. Studio package cards → ItemDetailPage links `[foundation]`
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — Studio section

The package card currently has two CTAs: "Enquire →" (scrolls to `#enquiry-form`) and "Book a Call →" (broken link to `/store/${handle}/book`).

**Replace:** Wrap the package card in `<Link to={`/store/${handle}/item/${p.id}`}>` (making the whole card clickable). Replace the two CTA buttons with:

- Fixed price packages (`price_type !== 'custom'`): `"Book Package →"` button → links to ItemDetailPage with `?action=deposit`
- Custom quote packages: `"View & Enquire →"` button → links to ItemDetailPage

Remove "Book a Call →" entirely. It's a dead link.

### F2. Deposit booking path on ItemDetailPage for Studio `[foundation]`
File: `src/pages/public/ItemDetailPage.tsx`

For `st.isStudio && product.product_type === 'package' && product.price_type !== 'custom'`:

Replace the current WhatsApp CTA with:
```tsx
<m.button
  className={`${styles.actionBtn} ${styles.ctaPrimary}`}
  onClick={() => setDepositClaimOpen(true)}
  whileTap={{ scale: 0.97 }}
>
  <Tag size={15} />
  Book & Pay Deposit
</m.button>
```

**DepositClaimSheet:** Reuse `ClaimSheet` with a `isDeposit={true}` prop. When `isDeposit`:
- Step 1 heading: "Booking Deposit" instead of "Claiming This Piece"
- Amount shown: deposit amount (`product.price * (product.deposit_pct / 100)` or `product.deposit_amount`)
- Step 3 confirmation message: `"Deposit for [package name] — ₦[deposit]. Remaining ₦[balance] due on project start."`
- No stock decrement

Add `isDeposit?: boolean` prop to `ClaimSheetProps` in `src/components/public/ClaimSheet/ClaimSheet.tsx`.

For `product.price_type === 'custom'` packages: CTA is "Send Enquiry →" which opens the inline enquiry form (already in the Package Proposal view on ItemDetailPage). No change needed here.

### F3. Enquiry form pre-fill from package context `[depends on F1]`
File: `src/pages/public/ItemDetailPage.tsx` — Package Proposal view

When `ItemDetailPage` for Studio is loaded with `?action=deposit` or `?package=true` query param, scroll the page to the enquiry form section on mount and pre-fill the "Project Type" field from `product.name`.

```tsx
const searchParams = new URLSearchParams(location.search);
const autoEnquire = searchParams.get('action') === 'enquire';

useEffect(() => {
  if (autoEnquire) {
    setEnquiryForm(f => ({ ...f, projectType: product.name }));
    setTimeout(() => {
      document.querySelector('[data-enquiry-form]')?.scrollIntoView({ behavior: 'smooth' });
    }, 400);
  }
}, [autoEnquire, product.name]);
```

Add `data-enquiry-form` attribute to the enquiry form section element.

### F4. Studio storefront enquiry form — package pre-fill from URL
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx` — `EnquiryForm` component

When `StorefrontPage` is loaded with `?package=[productId]` (e.g. from a direct package share link), pre-fill the form's project type from the matching product name.

Add `packageId?: string` prop to `EnquiryForm`. In `StorefrontPage`, read `searchParams.get('package')` and pass the matched product name as initial form state.

---

**Phase 3F done when:** A Studio buyer can view a package on ItemDetailPage, pay a deposit via the Claim flow, and receive a Trovéa receipt for the deposit. Custom-quote buyers can enquire with package context pre-filled.

---

## Phase 3G — Discovery & Return Visit Hooks
**Goal:** Buyers who browse or purchase have clear reasons to return: related items, store follows, and a recently-viewed shelf.

### G1. ReceiptPage — "Explore more from this store" section
File: `src/pages/public/ReceiptPage.tsx`

After the receipt card content, before the footer, render up to 2 items from the same store (same merchant_id), filtered to `status === 'live'` and excluding the purchased item. Use `MiniCard` component (already exists in ItemDetailPage — extract to `src/components/public/MiniCard/MiniCard.tsx` and reuse).

Section header: `"More from [merchant.store_name]"` in `.t-caps`.

This requires ReceiptPage to resolve the merchant from the receipt. Currently `ReceiptPage` reads the receipt fixture. The merchant can be derived from `receipt.merchant_id` mapped against fixture merchants.

Skip this section for Digital Creator receipts (delivery link is the focus, not browsing more) and for sold-out items.

### G2. "Follow this store" on StorefrontPage
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx`

Add a subtle follow CTA in the `contactSection`:

```tsx
<button className={sfStyles.followBtn} onClick={handleFollow}>
  {following ? '✓ Following' : 'Follow for updates'}
</button>
```

`handleFollow`:
1. Store `{ handle, timestamp }` in localStorage under `trovea_follows` array
2. Build WhatsApp message: `"Hi [storeName]! I'd love to be notified about new drops and restocks 📲"` → `window.open(waLink)`
3. Set `following: true` state (persisted to localStorage per handle)

On mount: read localStorage to set initial `following` state.

This is zero-infrastructure: the WhatsApp message starts the conversation. Future: backend follow list.

### G3. Notify me — expansion for non-drop stores
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx`

The drop `DropCountdown` component has a "Notify me" form (email + phone). Expose the same form for Vendor (when window is closed) and Host (when fully booked). These currently show nothing useful when the store has no active window/bookings.

For Vendor closed state: below the "Window closed" banner, show:
```
Be the first to know when we open.
[Email input]  [WhatsApp number]
[Notify me] button
```

On submit: show `"You're on the list."` + WhatsApp message to merchant: `"Hi [storeName], please add me to your notification list for new windows 🙏"`.

For Host fully-booked state: same form below the "Fully Booked" badge with copy: `"Join the waitlist for [nextAvailableMonth]."`.

### G4. Recently browsed shelf on StorefrontPage
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx`

Track product views in localStorage under `trovea_recent_[handle]`: an array of `{ id, name, price, image, timestamp }`, max 6 items, last 24h only (filter out older entries on read).

On `ItemDetailPage` mount: push the current product to the handle's recent list.

On `StorefrontPage`: read recent items, filter to the current handle, exclude currently-displayed items. If ≥ 2 recent items exist, render a horizontal scrollable shelf above the main grid:

```
"Recently browsed"  [MiniCard]  [MiniCard]  [MiniCard]  ···
```

Shelf uses `display: flex; overflow-x: auto; gap: 12px; padding: 16px 20px;` with `scrollbar-hide`. Each MiniCard links to ItemDetailPage. Clear button (ghost, small) at end of row: "Clear" → removes localStorage entry for this handle.

### G5. "More from this collection" on ItemDetailPage `[refine existing]`
File: `src/pages/public/ItemDetailPage.tsx`

The existing `relatedProducts` computation returns `products.filter(p => p.id !== item_id && p.status !== 'hidden').slice(0, 4)`. Refine:

```ts
const relatedProducts = useMemo(() => {
  const others = products.filter(p => p.id !== item_id && p.status !== 'hidden');
  // Prioritize same collection
  const sameCollection = collection
    ? others.filter(p => p.collection_id === collection.id)
    : [];
  const rest = others.filter(p => !sameCollection.some(s => s.id === p.id));
  return [...sameCollection, ...rest].slice(0, 4);
}, [item_id, products, collection]);
```

Update the section title: if `sameCollection.length > 0`, show `"More from ${collection.name}"` instead of `"More from ${merchant.store_name}"`.

---

**Phase 3G done when:** A buyer who views 3 items sees a "recently browsed" shelf on return. A buyer on a receipt page sees 2 relevant items from the store. A buyer who can't book today can join a waitlist in 1 tap.

---

## Phase 3H — Motion & Ceremony System
**Goal:** The three ceremonial moments are fully built. Page entrances feel like content arriving.

### H1. Add `--duration-enter` to entrance animations `[foundation]`
File: `src/lib/motion.ts`

Update `slideUp` variant:
```ts
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { ...SPRING_PAGE, duration: 0.6 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
};
```

### H2. Add `will-change: transform` to animated surfaces
Files: `src/styles/global.css`, `src/styles/cards.css`, `src/components/primitives/BaseDrawer/BaseDrawer.module.css`

Add to `.btn`, `.chip`, `.sf-card`, and BaseDrawer root element only. Not to generic containers.

### H3. Ceremony 1 — The Seal Issuance
File: `src/pages/merchant/TerminalPage.tsx`, `src/pages/merchant/TerminalPage.module.css`

State machine: `'review' → 'submitting' → 'ceremony_card' → 'ceremony_code' → 'ceremony_done'`

**`ceremony_card`:** Full-viewport `.section-velvet` overlay. Receipt card drops in from y: -40, opacity 0 → 0, opacity 1 with `SPRING_PAGE, duration: 0.9`. Maroon seal rotates from -15deg, scale 0.6 → 0deg, scale 1 at delay 200ms. Single amber shimmer pass via `@keyframes sealShimmer` (600ms, forwards, no loop).

**`ceremony_code`:** Seal code reveals character by character via `setInterval(40ms)`. DM Mono, 28px, `var(--color-gold)`. On first seal ever: show `"Your first receipt. It lives here forever."` in Cormorant Garamond italic, fades out after 2s.

**`ceremony_done`:** Share + Done CTAs slide up 400ms after code completes.

### H4. Ceremony 2 — The Store Going Live
File: `src/pages/merchant/SettingsPage.tsx`

Add `has_gone_live: boolean` to `merchant.store.ts`. On first `store_open: true` toggle: 1.5× animation speed, "Your store is live" status line fades in/out (Playfair italic, 18px, `var(--color-accent)`), URL panel slides up with store URL + copy button.

### H5. Ceremony 3 — Drop Selling Out
Files: `src/lib/store/archive.store.ts`, `ArchiveView.tsx`, `DashboardView.tsx`

`archive.store.ts`: add `lastSoldOutProductId: string | null`. Set when `updateProductStock()` sets stock to 0 on a live item.

`ArchiveView`: subscribe, apply `soldOutPulse` CSS animation (single pulse, `var(--color-accent-glow)`, 500ms, forwards) + cross-fade badge to `.badge--sold`.

`DashboardView`: subscribe, render sold-out notification tile that slides in from y: -100% with `SPRING_UI`, auto-dismisses after 4s.

### H6. Drop countdown urgency state
File: `DashboardView.tsx`

`isUrgent = timeLeft.d === 0 && timeLeft.h === 0 && timeLeft.m < 30`. Apply `.countdownUrgent` class: `color: var(--color-accent)` on countdown numbers.

---

**Phase 3H done when:** All three ceremonies play correctly on 375px viewport. Button/card press feedback is physically believable.

---

## Phase 3I — Loading States & Skeleton System
**Goal:** No component renders empty or unstyled while loading.

### I1. Skeleton primitive classes `[foundation]`
File: `src/styles/global.css`

```css
.skeleton-text-sm  { height: 12px; width: 60%; }
.skeleton-text-md  { height: 14px; width: 80%; }
.skeleton-text-lg  { height: 18px; width: 70%; }
.skeleton-block    { height: 120px; width: 100%; }
.skeleton-avatar   { width: 48px; height: 48px; border-radius: var(--r-full); flex-shrink: 0; }
.skeleton-card     { height: 220px; width: 100%; }
.skeleton-card-lg  { height: 380px; width: 100%; }
.skeleton-row      { height: 72px; width: 100%; }
```

All extend `.skeleton` — use both classes: `className="skeleton skeleton-card"`.

### I2. StorefrontPage product grid skeleton
Replace the current custom inline skeleton styles in `StorefrontPage` loading state with the new `.skeleton.skeleton-card` and `.skeleton.skeleton-card-lg` primitives. Skeleton count matches the grid column count (2 for grid, 1 for editorial).

### I3. LedgerPage list skeleton
When loading: render 5 `.skeleton.skeleton-row` inside the list container with identical 20px horizontal padding.

### I4. DashboardView stat skeleton
When loading: render 3 `.skeleton.skeleton-block` in the stat widget area.

### I5. ReceiptPage skeleton
When loading: `.neu-surface` card with `.skeleton-block` for the maroon header, two `.skeleton-text-md` for buyer/seller info, `.skeleton-text-lg` for total.

### I6. ArchivePage skeleton
Replace any custom skeleton markup in `ArchiveView` with `.skeleton.skeleton-card` and `.skeleton.skeleton-card-lg` primitives.

---

**Phase 3I done when:** All skeleton types render correctly under Slow 3G simulation. Zero layout shifts on data arrival.

---

## Phase 3J — Operational Flow Completions
**Goal:** Every Curator persona's primary daily flow is completable without visible gaps.

### J1. Vendor Fulfillment View
File: `src/pages/merchant/LedgerPage.tsx`

Add `'fulfil'` tab (Vendor only). Layout: orders sorted by pickup time. Each row: buyer name, items, payment status chip, 44×44px round checkbox. Checking it calls `markFulfilled(receiptId)` in `ledger.store.ts` with 6s undo toast. Empty state: "No orders to fulfil today."

### J2. Vendor window state visual treatment
File: `src/pages/merchant/DashboardPage/DashboardView.tsx`

In `renderVendor()`: Dark (closed) → `.section-velvet` on header, "Store is closed." ghost text. Open → standard parchment, cap tracker dominant. Locked (cap reached) → `.surface-amber` on header, "Cap reached" badge.

### J3. Host no-show protocol
File: `src/pages/merchant/BookingsPage/BookingsView.tsx`

Past-start-time `confirmed` bookings: apply `.surface-amber`. Show "Mark arrived" / "Mark no-show" CTAs. No-show → Class B confirmation → retain deposit → synthetic ledger entry. 1-minute `setInterval` check on mount.

### J4. Host fully booked badge
File: `src/pages/public/StorefrontPage/StorefrontPage.tsx`

Check `storeType === 'host'` + all 14-day slots booked → `.badge-trusted` "Fully Booked" badge adjacent to store name in hero.

### J5. Digital Creator — typographic placeholder for missing images
File: `src/styles/cards.css`, `StorefrontPage.tsx`, `ArchiveView.tsx`

`.sf-card-image--digital-placeholder`: amber gradient background, product name in Playfair Display centered. Applied when `type === 'digital'` and no `image_url`.

### J6. Post-drop summary block (Collector)
File: `DashboardView.tsx` — `renderCollector()`

When last drop is `sold_out` or all items claimed: show "Drop complete." + revenue total (`.t-stat-number`) + items sold / unique buyers + "Share your results" `.btn.btn--neu` → opens `DropCardGenerator` in `post-drop` mode.

### J7. `Built on Trovéa` attribution
File: `StorefrontPage.tsx`

```tsx
<a href="https://trovea.store/join" className={styles.builtOn} target="_blank" rel="noopener noreferrer">
  Built on Trovéa
</a>
```
DM Mono 9px, ghost opacity, letter-spacing 2px, uppercase. Storefront only.

---

**Phase 3J done when:** Vendor can fulfil orders. Host can handle no-shows. Creator items always look intentional. Post-drop summary is visible after a sell-out.

---

## Phase 3K — Typography & Number Formatting
**Goal:** Prices align in lists. Headings never orphan. Prices never break.

### K1. Apply `tabular-nums` to all price elements
Audit: `LedgerPage.tsx`, `DashboardView.tsx`, `ArchiveView.tsx`, `TerminalPage.tsx`, `ReceiptPage.tsx`. Any element rendering `formatCurrencyFull()` must have `.t-mono` or `.t-price` class.

### K2. Apply `oldstyle-nums` to dashboard stat numbers
Audit `renderCollector`, `renderVendor`, `renderHost`, `renderDigital`, `renderStudio`. Large Playfair Display stat numbers → `.t-stat-number`.

### K3. Apply `text-wrap: balance` to headings
Audit: StorefrontPage store name, ReceiptPage title, DashboardView morning brief, ArchiveView title, all onboarding headings.

### K4. `white-space: nowrap` on all price elements
`.t-price` class (added in 3A) already has this. Audit all components to ensure price spans use `.t-price`.

---

**Phase 3K done when:** Price columns in Ledger align vertically. No heading orphans. Prices never line-break.

---

## Phase 3L — Language & Copy Audit
**Goal:** Every string in the product passes the "Curator, not engineer" test.

### L1. Verify Phase 3A language fixes (A10) are in place.

### L2. Empty state copy pass
| File | Current | Required |
|---|---|---|
| `ArchivePage.tsx` | "No items match this filter. Adjust your filters or mint a new asset." | "Nothing matches. Try a different filter." |
| `DispatchPage.tsx` | "Nothing here" | "Nothing dispatched yet. Items you ship will appear here." |
| `ArchiveView.tsx` | Generic | Per-type: Collector: "No pieces match." / Vendor: "No menu items match." |
| `StorefrontPage.tsx` | "Nothing here yet" | Per-type from QUALITY.md §5.1 |

### L3. Notification copy pass
File: `NotificationsPage.tsx` — `deriveNotifications()`. Rewrite from system perspective → Curator perspective per QUALITY.md §4.4. `title: 'New receipt created'` → `'${buyer_name} is pending payment'`.

### L4. Toast copy pass
Audit all `addToast()` calls. Remove trailing periods from single-sentence toasts. Remove "successfully." Ensure error toasts are attributive and directive.

### L5. Confirmation sheet copy pass
All Class B/C confirmations: consequence in plain language, CTA is a verb, body doesn't restate the button.

---

**Phase 3L done when:** No string could have been written by a software engineer. Every error is attributive and directive.

---

## Phase 3M — Public Storefront Polish
**Goal:** Public-facing pages are screenshot-worthy at every moment and pass the ghost-buyer test.

### M1. Trust bar completeness audit
File: `StorefrontPage.tsx`

Verify all four trust signals: receipts issued count, member since, active items, last active. All use `formatRelativeDate()` and `formatCurrencyFull()`.

### M2. Payment method indicator
File: `StorefrontPage.tsx`

Below store description: DM Mono 9px, ghost opacity, inline flex row with dot separators showing accepted payment methods from `merchant.payment_methods`.

### M3. ReceiptPage visual quality audit
File: `ReceiptPage.tsx`, `ReceiptPage.module.css`

- Header: `.section-velvet`
- Seal code: DM Mono, `tabular-nums`, `white-space: nowrap`
- Verified badge on all receipts from verified stores
- Line items: `tabular-nums`
- Total: `.t-stat-number`
- No hardcoded colors in receipt CSS

### M4. ItemDetailPage CTA thumb-reach audit
File: `ItemDetailPage.tsx`

On 375px viewport, primary CTA must be in the bottom 40% of visible viewport. Sticky CTA bar uses `env(safe-area-inset-bottom)` for iOS.

---

**Phase 3M done when:** Ghost-buyer test passes. A user opening a Trovéa store link from WhatsApp understands within 3 seconds they are on a legitimate commerce platform.

---

## Phase 3N — Zero-State Quality
**Goal:** Every empty state is an invitation, not an absence.

### N1. Per-type zero states in Archive
File: `ArchiveView.tsx`

- Collector: `"Add your first piece."` / `"Your collection lives here. It fills up one item at a time."`
- Vendor: `"Post your first menu item."` / `"Your window opens when you have something to offer."`
- Host: `"Add your first service."` / `"Your schedule begins with the first slot."`
- Creator: `"Upload your first product."` / `"Every creator starts with a single file."`
- Studio: `"Add your first package."` / `"Your portfolio speaks first. Your packages close."`

### N2. Per-type zero states in Ledger
File: `LedgerPage.tsx`

- Collector: `"Your Ledger is empty."` / `"It fills up the first time you seal a receipt."`
- Vendor: `"No orders yet."` / `"Your first order appears here when your window opens."`
- Host: `"No bookings sealed."` / `"Confirmed bookings with receipts appear here."`
- Creator: `"No sales yet."` / `"Your first sale appears here after your first download."`
- Studio: `"No projects sealed."` / `"Confirmed projects with receipts appear here."`

### N3. Dashboard zero state (no items added)
File: `DashboardView.tsx`

When `products.length === 0` in all `renderX()` functions: single contextual prompt with a CTA to add first item. Per-type copy from QUALITY.md §5.1.

---

**Phase 3N done when:** Every empty state tells a story, is per-type accurate, and gives exactly one path forward.

---

## Final Quality Gate

Before any phase is marked complete, run:

```bash
# Token audit
grep -r "box-shadow:" src/ | grep -v "var(--shadow" | grep -v "tokens.css" | grep -v "/\*"

# Color audit
grep -rE "#[0-9a-fA-F]{3,6}" src/components src/pages --include="*.css" --include="*.tsx"

# Typography audit
grep -r "font-family:" src/components src/pages --include="*.css" | grep -v "var(--font"

# Language audit
grep -rn "successfully\|Oops\|uh oh\|please try again" src --include="*.tsx" -i

# confirm() audit
grep -rn "confirm(" src --include="*.tsx"

# Broken link audit (phases 3C–3F)
grep -rn '"/store/.*book"' src --include="*.tsx"
```

All commands must return zero results. Then run the human review checklist from QUALITY.md Part XI.
