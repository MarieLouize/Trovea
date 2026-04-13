# Trovéa — System Invariants

These rules are absolute. No feature, persona need, or edge case overrides them.
Read this before implementing anything that touches receipts, transactions, or user data.

---

## Immutability Rules

| Entity | Rule |
|---|---|
| Receipts (Seals) | No code path may UPDATE or DELETE a receipt record after issuance. Period. |
| Products / Services | Never deleted. Status changes only (`live → hidden → sold_out`). ID is stable forever. |
| Receipt Log | Append-only. No DELETE on receipt_log entries. No UPDATE. |
| User Role | Role assignment is permanent in v1. No role switching. |
| Handle | Merchant handle is locked after store initialization. Not editable in v1. |
| Store Type | Store type is locked after store initialization. Not editable in v1. |

**In static mockup (Phase 1):** These constraints apply to local state as well. Do not build any UI that modifies a receipt after it's been "issued". The Terminal ceremony creates the receipt; nothing after that can change it.

---

## Transaction Rules

- Inventory decrements ONLY at Seal issuance in the Terminal — never in the Ledger or Dispatch
- Window caps decrement only at Vendor order confirmation — not at pre-order submission
- Slot availability updates only at booking confirmation — not at slot selection
- All Terminal issuance operations must be atomic — full success or full rollback (in Phase 2)
- Server must revalidate all totals before Terminal writes — client-side math is display only
- Checkout Intents and pre-order submissions do NOT decrement inventory — only confirmed Curator Seal does

**What this means in Phase 1 (static mockup):**
- When Terminal issues a Seal, update stock_level in `archive.store.ts`
- Don't decrement stock when an item is added to the Visor — only on Seal issuance
- The displayed totals (subtotal, discount, total) are local state only — no "server validation" yet

---

## Privacy Rules

- Buyers never see the Curator's Command Surface (Dashboard, Archive, Terminal, Ledger, Insights)
- Customer PII (name, WhatsApp, email) never surfaced in Insights — ever
- store_config customisation only affects the owning Curator's public storefront
- Buyer data in Ledger Buyers tab is visible only to the Curator
- Delivery URLs for digital products: one-time or time-limited — never permanently public
- Report content is never shown to the Curator being reported — admin only

---

## UI / UX Invariants

### Never
- Never confirm whether an email address exists in the system (Auth page)
- Never show celebratory icons or overly emotional UI responses — tone is calm, institutional
- Never use red colour for urgency signals — amber/copper tones only
- Never allow Seal issuance with a single tap — always slide-to-confirm or long-press
- Never auto-issue a receipt under any circumstances
- Never expose raw Supabase error codes to the user

### Always
- Always show the number of items, orders, or bookings in the relevant badge/count
- Always use the `₦` symbol for currency — not "NGN", not "N", not "#"
- Always apply `import type { }` for TypeScript type-only imports
- Always use `@/lib/motion` for Framer Motion imports, never `framer-motion` directly

---

## The Architect — Pinned Elements

The Architect has constraints on what can be reordered or hidden:

- **Store Header is pinned to position 1** — it cannot be hidden or reordered
- **Core commerce section cannot be hidden**:
  - Collector: Product Grid
  - Vendor: Window Status + Menu
  - Host: Service Menu
  - Digital Creator: Digital Catalogue
  - Studio: Service Packages
- Changes are NOT live until "Publish" is explicitly clicked
- Publish: atomic write of full store_config — all layers or none
- Discard: confirmation dialog → preview resets to last published state

---

## Store Pause Constraints

When `merchant.is_paused = true`:

| Feature | Behaviour during pause |
|---|---|
| Trovéa Checkout (Claims) | Disabled — no new claims |
| The Bag | Can browse and build; "Send to Curator" disabled |
| Hold System | No new holds; existing holds continue to expiry |
| Bookings (Host/Studio) | Booking CTA disabled; existing confirmed bookings unaffected |
| Drop/Window announcements | Remain scheduled; activate when pause lifts if datetime hasn't passed |
| WhatsApp contact | Always remains active — buyers can still reach Curator directly |
| Storefront content | Items/portfolio still visible — browsing preserved, no transactions |

---

## Admin Constraints

- All admin actions are logged — no silent modifications. Append-only audit trail.
- Admin cannot modify or delete Seals — immutability applies to admins too
- Admin cannot view buyer payment proof images in bulk — must go to specific claim record
- Admin roles assigned directly in database — no in-app admin creation flow in v1
- Admin panel not linked from any public surface, nav, or footer
- Store suspension only possible via admin action — no automated suspension
- No automated suspensions without admin review — threshold triggers review priority, not action

---

## Claim System Constraints

- Only one active claim per item/variant at a time — second attempt shows "Claim already pending"
- Claim auto-expires after 24 hours if Curator takes no action — item returns to live
- Proof images stored in private storage — not publicly accessible
- Trovéa does not verify proof images — the trust relationship is between Curator and buyer
- Trovéa does not verify bank account details with any bank API

---

## Data Model Invariants

- `product.price` is stored in **naira integers** (NOT kobo) — do not convert on read
- `receipt.delivery_fee` is stored in **naira integers**, consistent with all other monetary fields
- `product.stock_level` is `null` when `has_variants = true` — stock lives on variants only
- `section_states` only has 4 keys — `'section-hero'`, `'section-about'`, `'section-slots'`, `'section-featured'`
- `section_order` can have 7 different keys including the 4 above plus `'section-header'`, `'section-grid'`, `'section-contact'`
- The three keys in `section_order` that are NOT in `section_states` (`section-header`, `section-grid`, `section-contact`) are always visible and cannot be toggled off

---

## Performance Constraints (Phase 2 targets, but design for them now)

- FCP < 1.5s on 3G mobile
- Inventory/slot status revalidates every 60 seconds
- CSS custom properties injected server-side — no FOUC
- Product images lazy-loaded below the fold
- Fonts preloaded in `<head>` with `font-display: swap`

In Phase 1 (static mockup), these are aspirational. Don't do anything that actively works against them (e.g., blocking renders, synchronous heavy computation, importing unnecessary libraries).