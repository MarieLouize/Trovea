# Trovéa — Design System

> Canonical visual rules for every session. Never deviate from these tokens.

---

## Philosophy

Trovéa is a **curated marketplace for people with taste**. Every surface is a material — raised, tactile, neumorphic, lit from above-left with soft dual shadows. Commerce feels precious and considered, not transactional. The entire UI is warm grey parchment (light) by default, with an optional deep maroon velvet mode. The product is for Nigerian Curators aged 20–35 who want their storefront to feel as intentional as their aesthetic.

**The metaphor:** a high-end boutique whose owner has exquisite taste. Grey parchment = considered, neutral, premium. Deep maroon = authority, ceremony, trust. Antique gold = rarity, prestige, status. The neumorphic surface system creates the illusion of material depth — surfaces push out of or press into the background, never float above it on a flat plane.

**The emotional goal:** every buyer should feel like they discovered something worth wanting. Every Curator should feel like the platform was built for them personally.

---

## Fonts

Loaded via Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Inter:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet">
```

| CSS variable | Font | Use |
|---|---|---|
| `--font-serif` | Playfair Display | Store names, receipt totals, page headlines, hero numbers |
| `--font-serif-alt` | Cormorant Garamond | Subtitles, taglines, editorial body copy, pull quotes |
| `--font-sans` | Inter | UI labels, form fields, body copy, descriptions, navigation |
| `--font-mono` | DM Mono | IDs, timestamps, prices, status labels, caps labels, codes |

### Typography classes

| Class | Font | Size | Weight | Use |
|---|---|---|---|---|
| `.t-display` | Playfair Display | clamp(52px, 7vw, 96px) | 400 | Hero display text |
| `.t-headline` | Playfair Display | clamp(32px, 4vw, 56px) | 400 | Page-level headings |
| `.t-title` | Playfair Display | 26px | 400 | Section titles, store names |
| `.t-subtitle` | Cormorant Garamond | 20px | 300 italic | Taglines, editorial subtitles |
| `.t-body-lg` | Inter | 17px | 300 | Long-form body copy |
| `.t-body` | Inter | 14px | 400 | Standard body copy |
| `.t-caps` | DM Mono | 10px | 500 | UPPERCASE labels, metadata, field labels |
| `.t-label` | Inter | 11px | 600 | UPPERCASE UI labels, navigation |

### Text effect classes

| Class | Effect | Use |
|---|---|---|
| `.text-foil` | Gold gradient + drop-shadow | Prestige prices, status numbers, premium CTAs |
| `.text-foil-maroon` | Maroon gradient | Display headings on parchment |
| `.text-debossed` | Pressed-in shadows (light top, dark bottom) | Parchment-only labels, watermarks, system text |
| `.text-embossed` | Raised shadows (light top, dark bottom) | Labels on dark/velvet surfaces |
| `.text-soft` | Subtle drop-shadow + tight tracking | General refined headings |

**Rule:** `.text-debossed` is only for grey parchment surfaces. On velvet/dark surfaces use `.text-embossed` or `.text-foil`. Never swap these — the shadow directions invert on dark backgrounds and will look broken.

---

## Canvas & Background

### Grey Parchment (default)

```css
body {
  background-color: var(--bg); /* #9EA3AE */
  background-image:
    var(--noise),
    radial-gradient(ellipse at 12% 8%, rgba(255,250,240,0.18) 0%, transparent 45%),
    radial-gradient(ellipse at 88% 92%, rgba(0,0,20,0.14) 0%, transparent 45%),
    linear-gradient(145deg, var(--bg-warm) 0%, var(--bg) 50%, var(--bg-cool) 100%);
  background-blend-mode: overlay, normal, normal, normal;
  background-attachment: fixed;
}
```

The noise texture is embedded as an SVG data URI and applied at `opacity: 0.07`. It reads like quality stationery. Every surface on the page is a variation of this base — raised (lighter), inset (darker), or flat.

### Velvet Maroon (theme override)

```css
.section-velvet {
  background-color: #350006;
  background-image:
    var(--noise),
    radial-gradient(ellipse at 15% 10%, rgba(180,60,60,0.12) 0%, transparent 45%),
    radial-gradient(ellipse at 85% 90%, rgba(0,0,0,0.4) 0%, transparent 45%),
    linear-gradient(155deg, #420008 0%, #350006 55%, #260004 100%);
}
```

Used for: login/auth screens, The Seal issuance ceremony, premium upsell moments, and the Velvet Maroon store theme preset.

---

## Color Tokens

All values are CSS custom properties. Use the CSS var in inline styles and animation props; use the class names in JSX/HTML.

### Surfaces — Grey Parchment

| CSS variable | Hex | Use |
|---|---|---|
| `--bg` | `#9EA3AE` | Page background base |
| `--bg-warm` | `#A3A09B` | Gradient warm tilt |
| `--bg-cool` | `#97A0AD` | Gradient cool tilt |
| `--surface` | `#9EA3AE` | Default flat surface |
| `--surface-raised` | `#A8ADB8` | Raised/elevated surface |
| `--surface-inset` | `#939AA5` | Pressed/inset surface |

### Shadows — Neumorphic

| CSS variable | Value | Use |
|---|---|---|
| `--sh-light` | `rgba(255,255,255,0.48)` | Top-left highlight |
| `--sh-dark` | `rgba(10,10,14,0.22)` | Bottom-right shadow |
| `--neu-raise` | `8px 8px 18px var(--sh-dark), -8px -8px 18px var(--sh-light)` | Default raised card |
| `--neu-raise-lg` | `14px 14px 30px var(--sh-dark), -14px -14px 30px var(--sh-light)` | Hero cards, modals |
| `--neu-raise-sm` | `4px 4px 9px var(--sh-dark), -4px -4px 9px var(--sh-light)` | Chips, badges, nav items |
| `--neu-inset` | `inset 5px 5px 12px var(--sh-dark), inset -5px -5px 12px var(--sh-light)` | Input wells, pressed states |
| `--neu-inset-sm` | `inset 3px 3px 7px var(--sh-dark), inset -3px -3px 7px var(--sh-light)` | Small inputs, toggles |

**Rule:** Never use flat box shadows. Every shadow must have both a dark offset and a light offset to maintain the neumorphic material illusion. Using only a dark shadow will shatter the surface metaphor.

### Accent — Deep Maroon

| CSS variable | Hex | Use |
|---|---|---|
| `--accent` | `#390007` | Primary CTA, unread indicators, brand anchor |
| `--accent-mid` | `#5C0010` | Gradient start for buttons and icons |
| `--accent-glow` | `rgba(57,0,7,0.35)` | Glow shadows on accent elements |

### Prestige — Antique Gold

| CSS variable | Hex | Use |
|---|---|---|
| `--gold` | `#C9A84C` | Claim mode, prestige pricing, Trusted tier |
| `--gold-light` | `#E2C97E` | Gradient highlights on gold elements |
| `--gold-dim` | `rgba(201,168,76,0.4)` | Glow shadows on gold elements |

**Rule:** Gold is not a success color. Gold signals rarity, exclusivity, and premium status — Claim mode, locked tiers, The Seal ceremony. The active/success color is `#2ECB75` (green). Don't use them interchangeably.

### Text — Parchment Mode

| CSS variable | Hex | Use |
|---|---|---|
| `--text-primary` | `#0C0C0E` | Headings, prices, primary UI text |
| `--text-secondary` | `#2E2E35` | Body copy, descriptions |
| `--text-muted` | `rgba(12,12,14,0.52)` | Labels, captions, metadata |
| `--text-ghost` | `rgba(12,12,14,0.28)` | Disabled, placeholders, watermarks |

### Text — Velvet Mode

Use `rgba(240,237,232, ...)` with varying opacity on dark surfaces. The off-white `#F0EDE8` is the primary text color. Never use pure white on velvet — it reads as a rendering error, not design intent.

---

## Surface System

Trovéa uses three surface levels in parchment mode and a separate set for velvet mode. All surfaces use gradient backgrounds (not flat fill) with dual neumorphic shadows.

### Parchment Surfaces

| Class | Background | Shadow | Use |
|---|---|---|---|
| `.neu-surface` | `linear-gradient(145deg, var(--surface-raised), var(--surface))` | `var(--neu-raise)` | Default card, panel |
| `.neu-inset` | `linear-gradient(145deg, var(--surface-inset), var(--surface))` | `var(--neu-inset)` | Input wells, pressed blocks, stats |

All `.neu-surface` elements get the noise texture applied via `::before` at `opacity: 0.45`. Wrap content in `.neu-surface__body` (padding: 36px) or `.neu-surface__body.sm` (padding: 24px) to stay above the pseudo-element's z-index.

### Velvet Surfaces

| Class | Background | Shadow | Use |
|---|---|---|---|
| `.neu-velvet` | `linear-gradient(145deg, #420008, #2E0005)` | `10px 10px 24px #190002, -6px -6px 16px rgba(255,255,255,0.06)` | Cards/panels on velvet background |
| `.input-velvet` | `linear-gradient(145deg, #260004, #2E0005)` | `inset` | Inputs on velvet surfaces |

### Product Cards

`.product-card` is the primary commerce surface. It extends `.neu-surface` with:
- `border-radius: var(--r-xl)`
- `box-shadow: var(--neu-raise-lg)` — heavier elevation to make items feel discoverable
- `:hover` → `translateY(-10px) scale(1.01)` with spring easing — cards lift physically when explored
- The noise `::before` is at `z-index: 1`; all card content must be at `z-index: 2` or higher

Card image variants: `.card-image` (default parchment), `.card-image--maroon`, `.card-image--gold`. Height variants: default (300px), `.card-image--short` (220px).

---

## Border Radius

| CSS variable | Value | Use |
|---|---|---|
| `--r-xs` | `6px` | Tight badges, rule accents |
| `--r-sm` | `12px` | Inputs, small surfaces, buttons |
| `--r-md` | `18px` | Standard cards |
| `--r-lg` | `24px` | Section panels, modal bodies |
| `--r-xl` | `32px` | Product cards, hero surfaces |
| `--r-pill` | `50px` | Buttons, nav pill, chips |
| `--r-full` | `9999px` | Toggles, dots, avatars |

---

## Buttons

All buttons use DM Mono (`--font-mono`) at 10px with 2px letter-spacing and uppercase. This distinguishes them from body copy (Inter) and headings (Playfair).

### Primary (Maroon)
```html
<button class="btn btn--primary btn--lg">Seal Receipt</button>
<button class="btn btn--primary">View Ledger</button>
<button class="btn btn--primary btn--sm">Mint</button>
```
Background: `linear-gradient(145deg, var(--accent-mid), var(--accent))`. Shadow: `6px 6px 16px rgba(57,0,7,0.4)`.

### Prestige (Gold)
```html
<button class="btn btn--gold btn--lg">Unlock Signature</button>
<button class="btn btn--gold">Claim Slot</button>
```
Background: `linear-gradient(145deg, var(--gold-light), var(--gold))`. Text: `#1a1208` (dark, not white — white on gold reads as glare, not intent).

### Neumorphic (Neutral)
```html
<button class="btn btn--neu">Archive Item</button>
```
Appears to press into the surface on `:active` — switches from `var(--neu-raise-sm)` to `var(--neu-inset-sm)`.

### Ghost
```html
<button class="btn btn--ghost">Cancel</button>
```
Transparent background, 1px border at `rgba(0,0,0,0.1)`.

### WhatsApp
```html
<button class="btn btn--whatsapp btn--lg">Chat to Buy</button>
```
Background: `linear-gradient(145deg, #25D366, #1EB955)`. Used on Curator storefronts where WhatsApp is the primary sales channel. Always include the WhatsApp SVG icon.

### Size modifiers
`.btn--lg` — 16px/36px padding, `--r-md` radius. `.btn--sm` — 9px/18px padding. `.btn--block` — full-width, `justify-content: center`.

**Interaction rule:** All buttons get a shimmer sweep on hover via `::after` pseudo-element. On `:active`, `transform: scale(0.98)` with no translate.

---

## Badges & Status Chips

Badges sit on product card images (top-left, z-index 3). Status indicators appear in card metadata rows.

### Badge classes
```html
<span class="badge badge--new">New Arrival</span>
<span class="badge badge--sold">Sold Out</span>
<span class="badge badge--claim">Claim Mode</span>
<span class="badge badge--limited">Exclusive</span>
```

Font: DM Mono, 9px, 2px letter-spacing, uppercase. Radius: `var(--r-full)`. Padding: `8px 16px`.

- `badge--new` → maroon background, `#F0EDE8` text
- `badge--sold` → dark semi-transparent with backdrop blur
- `badge--claim` → gold background, `#1a1208` text
- `badge--limited` → frosted glass (rgba white + backdrop blur)

### Status dot indicators
```html
<div class="status-dot status-dot--active t-caps">Store Active</div>
<div class="status-dot status-dot--pending t-caps">Claims Open</div>
<div class="status-dot status-dot--sold t-caps">Sold Out</div>
<div class="status-dot status-dot--closed t-caps">Store Closed</div>
```
Rendered via `::before` pseudo-element (7px dot). Active: `#2ECB75` with green glow. Pending: `var(--gold)` with gold glow. Sold: `var(--accent)` with maroon glow. Closed: `rgba(0,0,0,0.3)` no glow.

### Filter chips
```html
<div class="chip is-active">All</div>
<div class="chip">Paid</div>
<div class="chip chip--gold">Claims</div>
```
Raised neumorphic surface by default. Active state: maroon gradient (or gold for `.chip--gold`). Spring transition on activate.

---

## Inputs & Forms

### Standard input
```html
<div class="field">
  <label class="field__label">Store Handle</label>
  <input class="input" type="text" placeholder="@yourstore">
  <p class="field__hint">Helper text here.</p>
</div>
```
`.input` uses `var(--neu-inset-sm)` at rest. On `:focus`: full `var(--neu-inset)` + `0 0 0 2.5px rgba(57,0,7,0.18)` focus ring + `border-color: rgba(57,0,7,0.2)`.

### Textarea
```html
<textarea class="textarea" placeholder="Paste a WhatsApp caption to auto-fill…"></textarea>
```
`min-height: 120px`, `resize: vertical`, same focus treatment as `.input`.

### Select
Wrap in `.select-wrap` for the custom `▾` indicator. `.select` has `appearance: none`.

### Segmented control
```html
<div class="seg">
  <div class="seg__item is-active">Storefront</div>
  <div class="seg__item">Archive</div>
  <div class="seg__item">Ledger</div>
</div>
```
Container uses `var(--neu-inset)`. Active item gets `var(--neu-raise-sm)` — appears to pop out from the pressed trough.

### Toggle
```html
<div class="toggle-wrap">
  <div class="toggle is-on"></div>
  <span class="toggle__label">Store is Open</span>
</div>
```
Off: inset shadow, surface background. On: maroon gradient background + inset shadow. Knob always has a raised shadow. Spring easing on state change.

---

## Navigation

### Mobile bottom nav
```html
<div class="mobile-nav">
  <div class="nav-item"><span class="nav-icon">🏠</span><span class="nav-label">Home</span></div>
  <div class="nav-item is-active">
    <div class="nav-badge">3</div>
    <span class="nav-icon">📋</span><span class="nav-label">Ledger</span>
  </div>
  <!-- FAB button at center position -->
  <div class="nav-item">
    <div style="...maroon FAB...">+</div>
  </div>
  <div class="nav-item"><span class="nav-icon">📦</span><span class="nav-label">Archive</span></div>
  <div class="nav-item"><span class="nav-icon">👤</span><span class="nav-label">Store</span></div>
</div>
```
The `.mobile-nav` container is a raised neumorphic pill with noise texture. Active items use `var(--neu-raise-sm)` — pops out. Inactive items have no shadow. The center FAB is a maroon rounded-square (not a circle), elevated with maroon shadow.

`.nav-badge` is a 16px maroon dot with white number for notification counts.

---

## The Seal — Receipt Card

The receipt is the most important surface in Trovéa. It must feel ceremonial.

```html
<div class="receipt">
  <div class="receipt-header">
    <!-- Store name, handle, receipt ID, seal code -->
  </div>
  <div class="receipt-body">
    <!-- Line items, divider, total, payment method -->
    <!-- Maroon seal icon bottom-right -->
  </div>
</div>
```

The `.receipt-header` uses the maroon gradient (`linear-gradient(160deg, var(--accent), var(--accent-mid))`) with noise at `opacity: 0.15` and a radial highlight at top-left. Store name in Playfair Display at 22px `#F0EDE8`. Seal code in DM Mono at 10px, muted.

The `.receipt` body is the wider parchment-raised surface. Total is Playfair Display at 36px. Payment method is DM Mono at 9px.

**The seal icon** (bottom-right of receipt body): 52×52px maroon square with `border-radius: 12px`, maroon drop shadow, containing a shield-check SVG in `#F0EDE8`. This icon is the visual weight anchor of the receipt — it must always be present.

---

## Progress Bars

```html
<div class="progress-track">
  <div class="progress-fill" style="width: 60%;"></div>
</div>
```

`.progress-track`: inset neumorphic, `height: 10px`. `.progress-fill`: maroon gradient with shimmer `::after` animation (opacity 0→1→0 on 2s loop). `.progress-fill--gold` for claim slots.

**Note:** Unlike AcePadi's system, Trovéa progress bars animate `width` (not `scaleX`) since there is no Framer Motion dependency in the base system. If using a React/animation framework, prefer `scaleX` with `transformOrigin: left center`.

---

## Dashboard Widgets

### Stat widget
```html
<div class="stat-widget">
  <div class="stat-widget__icon"><!-- SVG --></div>
  <div class="stat-widget__label">Revenue Today</div>
  <div class="stat-widget__val">₦127k</div>
  <div class="stat-widget__delta delta--up">↑ 23% vs yesterday</div>
</div>
```

Icon variants: maroon (default), gold, green (`#2ECB75`). Delta colors: `delta--up` (#2ECB75), `delta--down` (var(--accent)).

### Trust bar
```html
<div class="trust-bar">
  <div class="trust-bar__item">
    <span class="trust-bar__val">127</span>
    <span class="trust-bar__key">Receipts</span>
  </div>
  <!-- more items... -->
</div>
```
Inset surface, horizontal flex with `border-right` dividers. Value in Playfair Display at 22px. Key in DM Mono at 8px, ghost opacity.

### Morning brief (contextual banner)
An inset surface row combining a contextual emoji icon, a plain-language status message, and a primary CTA. Appears at top of dashboard. Content is driven by the Curator's actual data state (pending payments, open claims, etc).

---

## Notifications

```html
<div class="notif notif--unread">
  <div class="notif__icon">💸</div>
  <div class="notif__body">
    <div class="notif__title">Payment Overdue</div>
    <div class="notif__message">Ada Okafor — ₦85,000 pending for 52 hours.</div>
    <div class="notif__time">2 hours ago · Tap to open Ledger</div>
  </div>
</div>
```

`.notif--unread` gets a 3px maroon left-border accent via `::after`. On `:hover`, translates `4px` right with spring easing — the card slides toward the content it represents. Icon is 40px × 40px raised neumorphic square with emoji. Title is Inter 13px 600. Message is Inter 12px muted. Time is DM Mono 9px ghost.

---

## Curator Theme Presets

Five named theme presets that remap CSS custom properties simultaneously. Structure is identical across all themes — only color values change.

| Theme | Surface Base | Accent | Use Case |
|---|---|---|---|
| Grey Parchment | `#9EA3AE` | `#390007` maroon | Default, all types |
| Warm Ivory | `#EDE8DF` | `#390007` maroon | Collectors, lifestyle |
| Deep Obsidian | `#111114` | `#C9A84C` gold | Digital creators, studios |
| Terracotta | `#C4866A` | `#1A0E08` ink | Vendors, food sellers |
| Blush Mist | `#D4B8B8` | `#6B1230` deep rose | Hosts, beauty services |

Each preset remaps: `--bg`, `--bg-warm`, `--bg-cool`, `--surface`, `--surface-raised`, `--surface-inset`, `--sh-light`, `--sh-dark`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-ghost`, `--accent`, `--accent-mid`, and the neu shadow variables derived from them.

**Rule:** The neumorphic shadow system is entirely derived from surface color. When surface changes, both `--sh-light` (brighter tint) and `--sh-dark` (darker shade) must be recalculated proportionally. Never borrow shadow values from a different theme — the illusion will break.

---

## Motion

### Easing tokens

| CSS variable | Curve | Use |
|---|---|---|
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Card hovers, toggles, chips, bottom sheet |
| `--ease-out` | `cubic-bezier(0.34, 1, 0.64, 1)` | Page reveals, drawers opening |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | State changes, fades, input focus |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Ceremony animations, grave actions |

### Duration tokens

| CSS variable | Value | Use |
|---|---|---|
| `--dur-instant` | `80ms` | Focus rings, pressed states |
| `--dur-fast` | `150ms` | Chip select, micro-feedback |
| `--dur-base` | `250ms` | Hover, toggle, nav item |
| `--dur-slow` | `400ms` | Card hover, drawer open |
| `--dur-enter` | `600ms` | Page section entrance |
| `--dur-ceremony` | `900ms` | The Seal issuance, achievements |
| `--dur-ambient` | `3000ms` | Subtle pulse, breathing animations |

### Entrance stagger

On page load: header first, then blocks at `+80ms` each (max 4 layers). Pattern:

```css
.animate-in { animation: fadeUp 0.7s var(--ease-out) both; }
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.45s; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Trigger via `IntersectionObserver` for below-fold sections.

### Motion rules

1. **The system breathes, it does not perform.** If removing an animation makes the UI feel cold or confusing, it stays. If it just looks nice, cut it.
2. **Ceremony is earned.** The Seal issuance gets `--dur-ceremony` and a rotation-drop entrance. Everything else is proportionally quieter. Inflating motion devalues ceremony.
3. **Spring easing only on touch-responsive elements.** Use `--ease-spring` for: card hover, toggle, chips, nav items. Use `--ease-out` for page entrances. Use `--ease-in-out` for grave/irreversible actions.
4. **Stagger on entrance, not on exit.** Exit animations are always faster than entrance — content leaves quickly, arrives deliberately.
5. **No `translateX` on mobile.** Triggers horizontal scroll flash on Android mid-range devices. Use `translateY` for entrance reveals.
6. **No scale animations on page load.** Causes layout repaints. Use `opacity + translateY` only.
7. **Mobile-first timing.** All durations are calibrated for mid-range Android (Tecno, Infinix, Samsung A-series) at 60fps.

---

## Spacing Scale

| Value | Use |
|---|---|
| 4px | Icon gaps, rule accents |
| 8px | Inline spacing, icon-label gaps |
| 16px | Card internal spacing, form field gaps |
| 28px | Panel padding (standard) |
| 48px | Section breathing room |
| 80px | Page section gaps |

---

## Empty States & Loading

Every empty and loading state must feel like a considered design moment, not a blank gap. The noise texture on inset surfaces keeps empty states from feeling broken — they read like quality stationery awaiting inscription.

```html
<div class="neu-inset" style="padding: 60px; text-align: center;">
  <div style="font-family: var(--font-serif-alt); font-size: 36px; color: var(--text-ghost); font-style: italic;">—</div>
  <h3 class="t-title" style="color: var(--text-muted);">The Archive is Empty</h3>
  <p class="text-debossed">No items found in this collection.</p>
  <button class="btn btn--neu" style="margin-top: 28px;">+ Mint First Item</button>
</div>
```

**Rule:** Never show a bare white/grey box for empty states. The dash `—` in Cormorant Garamond italic is the canonical empty state visual anchor.

---

## Format: Naira

Always `₦85,000` (prefix, comma-separated, no decimals unless cents are meaningful). In DM Mono for metadata/receipts; Playfair Display for hero pricing; Inter for form labels.

---

## Curator Design Questions (Persona Contracts)

Every feature shipped must pass at least one of these:

| Curator | Question |
|---|---|
| Adaeze (Collector) | Does this make Friday drops feel like an event — and protect her from chaos after it goes live? |
| Tobi (Vendor) | Does this help run a tight, capped, time-boxed food drop — and stay dark cleanly between windows? |
| Chisom (Host) | Does this reduce booking management time — and protect income from no-shows and calendar chaos? |
| Femi (Digital Creator) | Does this let him sell and deliver digital products beautifully — with proper launch mechanics? |
| Ngozi (Studio) | Does this make her look like the professional she is — and reduce back-and-forth before a client commits? |

When a feature serves one Curator but frustrates another, that tension must be resolved before shipping.

---

## Non-Negotiables

1. **NEVER** render a blank dark or blank light screen — every loading/empty/error state has a fallback with the parchment texture
2. **NEVER** use flat box shadows — every shadow must have both a dark offset and a light offset (neumorphic pair)
3. **NEVER** use hardcoded hex values in production code — always use CSS custom properties
4. **NEVER** apply `.text-debossed` on velvet/dark surfaces — use `.text-embossed` instead
5. **NEVER** use pure white (`#ffffff`) as a surface color — the system is warm and material, not clinical
6. **NEVER** use gold to mean "success" — gold means rarity and prestige; use `#2ECB75` green for confirmations
7. **NEVER** use `translateX` animations on mobile — causes horizontal scroll flash on Android
8. **NEVER** scale animate on page load — causes layout repaints
9. **Neumorphic integrity:** when changing themes, recalculate both `--sh-light` and `--sh-dark` from the new surface color — never borrow shadow values cross-theme
10. **Ceremony is earned:** The Seal is the only element that gets `--dur-ceremony` (900ms). Inflating animation duration elsewhere devalues it

---

## Currency Symbol

- `₦` = Nigerian Naira (always prefix, no space, comma-separated thousands, no decimals)