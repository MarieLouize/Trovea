# Trovéa — Coding Conventions

These rules apply to every file, every phase, without exception. When in doubt, check this doc.

---

## File Structure Rules

### Every page gets a pair
New pages always get both:
- `PageName.tsx`
- `PageName.module.css`

Never create a page with only a `.tsx` file and no CSS module. Never use inline `style={{}}` objects as a replacement for proper CSS on new pages.

### Sub-components live in the same file
If a page or component needs a sub-component that isn't shared elsewhere, define it in the same `.tsx` file above the main export. Do not create a new file just for a small internal component.

### index.ts re-exports
Every page directory gets an `index.ts` that re-exports the default:
```typescript
export { default } from './PageName';
```

---

## TypeScript Rules

### All type-only imports use `import type`
```typescript
// CORRECT
import type { StoreConfig, CardStyle } from '@/lib/types';
import type { Product, ProductVariant } from '@/lib/types';

// WRONG — will cause Vite isolatedModules errors at runtime
import { StoreConfig, CardStyle } from '@/lib/types';
```

This applies to: all interfaces, all type aliases, all enums from type files.
Runtime values (constants, functions, components) use regular imports.

### No `as any` casts
Never. If you need to access a property that TypeScript doesn't know about, fix the type instead.

### No non-null assertions on uncertain values
Use optional chaining (`?.`) and nullish coalescing (`??`) instead of `!`.

---

## CSS Rules

### Tokens only — no hardcoded values
Use CSS custom properties from `src/styles/tokens.css` for all colors, spacing, shadows, radii, timing.

**The two permitted exceptions:**
- `#F0EDE8` — light text color on dark palette backgrounds (maroon accent, velvet)
- `#1A1208` — dark text color on gold elements

No other hardcoded hex values, no hardcoded pixel values for spacing (use `var(--space-N)`), no hardcoded font-family strings (use `var(--font-serif)` etc.).

### Neumorphic shadow pattern
Every card and raised surface uses this pattern:
```css
/* Raised state (cards, buttons) */
background: linear-gradient(145deg, var(--color-surface-raised), var(--color-surface));
box-shadow: var(--shadow-raise);

/* Input default */
box-shadow: var(--shadow-inset-sm);

/* Active / pressed */
box-shadow: var(--shadow-inset);
```

### Noise texture on every card surface
Every card `::before` pseudo-element:
```css
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--noise);
  background-size: 200px;
  opacity: 0.35;      /* 35–45% — adjust per surface */
  pointer-events: none;
  z-index: 1;         /* above card bg, below card content */
}
```
Don't forget `position: relative; overflow: hidden` on the card itself.

### CSS Module class naming
Use camelCase. Vite is configured with `localsConvention: 'camelCase'`.
```css
/* In .module.css */
.sectionTitle { }
.cardActive { }
.trustDotOpen { }
```

---

## Touch Target Rule
Every interactive element (buttons, links, tabs, toggles) must have:
```css
min-height: 44px;
```
This is the iOS/Android minimum touch target size. No exceptions, even for icon-only buttons.

---

## Animation Rules

### All imports from `@/lib/motion`
```typescript
// CORRECT
import { m, AnimatePresence, Reorder, useDragControls } from '@/lib/motion';

// WRONG
import { motion, AnimatePresence } from 'framer-motion';
```

### `whileTap` on every interactive element
Every button, card, link, and tab should have `whileTap={{ scale: 0.97 }}` (or `0.985` for larger targets).
Use `m.button`, `m.a`, `m(Link)`, or wrap in `m.div`.

### `AnimatePresence` for mount/unmount
Any element that conditionally renders should be wrapped in `<AnimatePresence>`.

### Spring configs
```typescript
// Drawers and bottom sheets
{ type: 'spring', stiffness: 340, damping: 36 }

// Shared element (layoutId pill)
{ type: 'spring', stiffness: 400, damping: 38 }

// Page-level transitions
{ duration: 0.18, ease: [0.32, 0, 0.16, 1] }
```

---

## Accessibility Rules

```typescript
// Every button/link without visible text
<button aria-label="Close drawer">...</button>

// Lists
<ul role="list">...</ul>

// Toggle buttons
<button aria-pressed={isActive}>...</button>

// Active nav items
<Link aria-current="page">...</Link>

// Form fields
<label htmlFor="store-name">Store name</label>
<input id="store-name" />
```

---

## Mobile-First Breakpoints
```css
/* Base: 375px — all styles start here */
.container { }

/* Expand at 768px */
@media (min-width: 768px) { }

/* Desktop sidebar at 1024px */
@media (min-width: 1024px) { }
```

---

## Nigerian Context — Always Applied
- Currency: `₦` (not "NGN", not "N", not "#")
- Prices: integer naira (NOT kobo) — `product.price` is already in naira
- Phone numbers: `+234XXXXXXXXXX` format for storage, `08012345678` for display
- Buyer names in fixtures: Nigerian names (Adaeze, Tobiloba, Chisom, Femi, Kemi, etc.)
- Store names: Lagos/Ibadan/Abuja context
- WhatsApp: primary commerce channel — all buy flows go through `wa.me` deeplinks

---

## State Management Rules
- **Zustand for shared state** — no prop drilling between sibling pages
- **Local `useState` for page-local state** — form fields, UI toggles, expanded sections
- **The Architect exception**: `CustomizePage` owns `draftConfig: StoreConfig` in local `useState` and passes it down to all layer components — this is intentional, not Zustand
- **Never write to stores from public pages** — public pages (StorefrontPage, ItemDetailPage, etc.) are read-only; they read from fixtures and stores but never write

---

## Import Order Convention
```typescript
// 1. React
import { useState, useMemo, useEffect } from 'react';

// 2. Router
import { Link, useParams, useNavigate } from 'react-router-dom';

// 3. External libraries
import { ArrowLeft, Share2 } from 'lucide-react';

// 4. Internal — motion (always from @/lib/motion)
import { m, AnimatePresence } from '@/lib/motion';

// 5. Internal — types (always import type)
import type { Product, StoreConfig } from '@/lib/types';

// 6. Internal — stores
import { useUIStore } from '@/lib/store/ui.store';

// 7. Internal — fixtures
import { FIXTURE_MERCHANT, FIXTURE_PRODUCTS } from '@/lib/fixtures';

// 8. Internal — constants
import { PALETTES } from '@/lib/constants/palettes';

// 9. Internal — utils
import { formatCurrencyFull } from '@/lib/utils/format';

// 10. Internal — components
import BaseDrawer from '@/components/primitives/BaseDrawer';

// 11. Styles (CSS module last, side-effect imports penultimate)
import '@/styles/cards.css';
import styles from './PageName.module.css';
```

---

## Hardcoded Values to Never Change

These specific values are correct by design — do not "fix" them:

```css
/* Product card status badge colors */
.sf-card-status-sold { background: rgba(12, 12, 14, 0.72); }
.sf-card-status-claim { background: rgba(201, 168, 76, 0.85); color: #1A1410; }
.sf-card-status-low { background: rgba(57, 0, 7, 0.8); color: #F0EDE8; }

/* WhatsApp green (only on WhatsApp CTA buttons) */
background: linear-gradient(145deg, #25D366, #128C7E);
box-shadow: 4px 4px 14px rgba(37, 211, 102, 0.3);
```

---

## Things That Have Broken Before (Do Not Repeat)

1. **`palette.preview.bg`** — wrong. Field is `palette.bg` (flat shape, no `.preview`)
2. **`stack.headingFont`** — wrong. Field is `stack.heading`
3. **`stack.bodyFont`** — wrong. Field is `stack.body`
4. **`palette.label`** — wrong. Field is `palette.name`
5. **`stack.label`** — wrong. Field is `stack.name`
6. **`sig.label`** — wrong. Field is `sig.name`
7. **`sig.description`** — wrong. Field is `sig.tagline`
8. **CardStyle ID `'editorial'`** — wrong. Valid IDs: `'clean-square'`, `'rounded-float'`, `'polaroid'`, `'film-strip'`, `'minimal-line'`
9. **SectionStates key `'hero'`** — wrong. Valid keys: `'section-hero'`, `'section-about'`, `'section-slots'`, `'section-featured'`
10. **`import { StoreConfig } from '...'`** — wrong. Must be `import type { StoreConfig } from '...'`
11. **Importing from `'framer-motion'`** — wrong. Always use `'@/lib/motion'`
12. **`layout.label`** — wrong. Field is `layout.name`