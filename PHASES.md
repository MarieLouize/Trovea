# Trovéa — Refinement Phase: "The Bespoke Instrument"

This phase transforms Trovéa from a "SaaS Mockup" into a **heavy, tactile digital instrument**. We are moving away from "web boxes" and toward **carved materials** (Parchment, Velvet, Gold Foil).

---

## Phase R1: Material & Environmental Integrity
**Goal:** Ensure every surface feels like a physical slab with consistent lighting and mass.

### Actionable Tasks:
- [ ] **Dynamic Lighting System:** Update `.neu-surface` and `.neu-inset` to automatically pull shadow colors from the parent `[data-palette]`. No more "gray shadows on maroon backgrounds."
- [ ] **Surface Topography:** Audit every page (Ledger, Terminal, Archive) and replace flat `<div>` containers with `.neu-surface` or `.neu-inset`.
- [ ] **Tactile Feedback:** Implement the "Mechanical Switch" rule: every button and interactive chip MUST transition from `raised` to `inset` on `:active` or `is-active` states.
- [ ] **Texture Grain:** Standardize the `--noise` overlay across all surfaces to ensure a consistent "paper-tooth" feel.

### Success Metrics:
- 100% of interactive elements use the `raised -> inset` physical state change.
- Zero "flat" backgrounds remaining in the Merchant OS.
- Shadow highlights (`--sh-light`) are context-aware (white on parchment, faint rose on velvet).

---

## Phase R2: Professional Motion & Inertia
**Goal:** Replace "digital pops" with "physical momentum."

### Actionable Tasks:
- [ ] **The "Heavy" Spring:** Update `@/lib/motion` to use high-stiffness, high-damping springs (`stiffness: 380, damping: 35`) for all drawers and modals.
- [ ] **Staggered Reveals:** Implement a mandatory `entrance-stagger` on all list views (Ledger entries, Product grids). Items must slide up with a slight overshoot.
- [ ] **Micro-Inertia:** Add a subtle "parallax tilt" or "lift" to cards when hovered (physical mass responding to focus).
- [ ] **State Transitions:** All layout changes (switching tabs, opening filters) must use `layout` prop in Framer Motion to animate the movement of surrounding elements smoothly.

### Success Metrics:
- Zero "instant" visibility toggles (all use `AnimatePresence`).
- Page transitions feel "weighted" (600ms+ duration with spring decay).

---

## Phase R3: Ceremonial Events (The Seal)
**Goal:** Elevate transactional moments into "events of authority."

### Actionable Tasks:
- [ ] **The Seal Drop:** Implement the canonical Receipt Issuance. The Maroon Seal must rotate 15deg and "drop" with a 900ms spring, accompanied by a heavy shadow expand.
- [ ] **Foil Treatments:** Apply `.text-foil` and `.text-foil-maroon` to prestige data points (Total amounts, Verified IDs, Trusted badges).
- [ ] **The Morning Brief:** Redesign the dashboard header as a "Handwritten Brief." Use `.t-subtitle` (Cormorant Garamond) for contextual summaries to create an editorial feel.
- [ ] **Empty State "Stationery":** Implement the `—` dash empty state in Cormorant Italic, ensuring empty views feel like "awaiting inscription" rather than "missing data."

### Success Metrics:
- The Receipt page feels like the most "expensive" screen in the app.
- Critical data (Naira) looks "stamped" (debossed) or "minted" (foil).

---

## Phase R4: Android Performance Audit
**Goal:** Ensure "heavy" design doesn't mean "sluggish" performance.

### Actionable Tasks:
- [ ] **GPU Acceleration:** Audit all animations to ensure they only touch `transform` and `opacity`. Remove `filter: blur` and `box-shadow` animations on low-end devices if they cause jank.
- [ ] **Touch Target Rigor:** Enforce 44px minimum on every single icon and link.
- [ ] **Image Loading:** Add "Material Skeletons" (shimmering inset wells) for all product images to maintain layout stability.

### Success Metrics:
- 60fps scrolling on mid-range Android (Tecno/Infinix/Samsung A-series).
- Zero layout shifts during image load.

---

## Final Vision Checklist
1. **Does it feel heavy?** (Shadows + Spring Motion)
2. **Does it feel smooth?** (Staggered Entrances + Inertia)
3. **Does it feel professional?** (Foil + Editorial Typography)
4. **Does it feel Nigerian?** (Naira Formatting + Curator Personas)
