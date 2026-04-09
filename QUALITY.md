# Trovéa — Quality Blueprint

> This document defines what "done" actually means for Trovéa. Not feature-complete. Not bug-free. Done as in: a buyer opens a store and feels something. A Curator publishes a drop and feels proud. Every interaction communicates taste, intentionality, and trustworthiness without a single word of marketing copy having to say so.
>
> Reference brands and systems drawn from: **Stripe**, **Linear**, **Superhuman**, **Apple**, **Bottega Veneta**, **Frame Denim**, **Highsnobiety**, **Notion**, **Framer**, **Net-a-Porter**, **Depop**, and **Paystack**.

---

## Part I — The Quality Standard

### What "flat" means and why it kills the product

When this document says the product currently "feels flat," it means: interactions have no consequence. Tapping a button produces a result, but produces no sensation. The neumorphic surfaces are visually present but behaviorally absent — they look like a material but don't respond like one. The product communicates function without communicating character.

Flat products are forgotten. Trovéa competes not just with Paystack Commerce or Selar or Flutterwave Storefront — it competes with the feeling a Curator gets from posting to Instagram and seeing 200 DMs. That dopamine loop is the real competition. Trovéa wins by making the business side feel as emotionally satisfying as the creative side.

**The test for non-flatness:** after completing any action in the product, a Curator should have a fleeting sense that the platform noticed. Not through a notification. Through the quality of the response itself.

---

## Part II — Motion Quality Standards

### Reference: Linear, Stripe, Apple iOS

Motion in Trovéa is not decoration. It is a communications layer. Every transition communicates one of four things: hierarchy (what is above what), causality (this caused that), state (something changed), or ceremony (this moment matters). If a motion communicates none of these, it is deleted.

---

### 2.1 — The Tactility Standard

Every interactive surface must respond to touch with physical believability. The neumorphic system exists precisely to enable this — raised surfaces should press down; inset surfaces should release upward.

**Goal:** When a user presses any interactive element, the element must change state within 80ms. No exceptions. 80ms is the threshold below which a response feels instantaneous. Above 80ms, a surface feels laggy and the material illusion breaks.

**Implementation requirements:**
- All buttons: `active` state uses `transform: scale(0.97)` + transition from `var(--neu-raise-sm)` to `var(--neu-inset-sm)` at `var(--dur-instant)` (80ms)
- All cards: `active` state presses with `scale(0.99)` + shadow reduction
- Toggles: knob slides with spring easing at `var(--dur-base)` (250ms), background transitions at `var(--dur-fast)` (150ms)
- Nav items: active state pops forward with `var(--neu-raise-sm)` appearing over 150ms; inactive state recedes simultaneously

**The Bottega Veneta principle:** luxury communicates through restraint. The press response should be subtle — `scale(0.97)`, not `scale(0.93)`. The shadow change should be perceptible, not dramatic. The user should feel it, not see it performing.

---

### 2.2 — The Entrance Quality Standard

Reference: how Linear's command palette opens. How Stripe's dashboard sections load. How Apple's sheets present.

**Goal:** Every screen transition and panel entrance must feel like content arriving, not content appearing.

**Rules:**
1. **No instant renders.** Every screen that loads new content must begin with opacity 0 and translate 16–24px down. Duration: `var(--dur-enter)` (600ms) for full screens, `var(--dur-slow)` (400ms) for panels and drawers.
2. **Stagger groups, not elements.** Don't stagger every card independently on a grid — the cumulative delay reads as slowness. Stagger logical groups: header first, content block second, action bar third. Max 3 stagger layers per screen.
3. **The first 80px is sacred.** The screen header (store name, page title, navigation context) must always load before body content. Users orient themselves from the top. Content that loads simultaneously with headers produces disorientation.
4. **Skeleton states are surfaces, not grey boxes.** Loading skeletons must use the same neumorphic surface class as the content they replace. A card skeleton is a `.neu-surface` with animated shimmer. A text skeleton is a series of inset bars. The page must look intentional during loading, not broken.
5. **Exit at half the entrance duration.** Content that leaves the screen exits at 200–300ms (opacity 0 + translateY -8px). Exits are never noticed consciously — they just feel clean.

---

### 2.3 — The Ceremony Standard

Reference: Stripe's payment confirmation animation. Apple Pay's haptic + visual confirmation. Duolingo's streak celebration.

There are three moments in Trovéa that are genuinely ceremonial and must be treated as such. Everything else should be proportionally understated so these moments land with full weight.

**The Three Ceremonies:**

**1. The Seal Issuance**
When a Curator issues a receipt (The Seal), this is the product's highest-value moment. It represents a completed transaction, a permanent record, and the core value proposition.

Requirements:
- Full-screen takeover or bottom sheet expansion covering 90%+ of the viewport
- The receipt card drops in from above with `var(--ease-in-out)` at `var(--dur-ceremony)` (900ms)
- Maroon seal icon rotates from -15deg to 0deg as it scales from 0.6 to 1.0, landing 200ms after the card
- Background pulses one subtle amber-gold shimmer across the velvet surface (single pass, not looping)
- The Seal code is revealed character by character (typewriter, DM Mono, 40ms per character) after the card lands
- Share and Done buttons enter last, 400ms after Seal code completes
- No sound. The visual weight is the sound.

**2. The Store Going Live**
When a Curator publishes their storefront for the first time, or toggles their store open.

Requirements:
- Toggle animation plays at 1.5× normal duration for first-publish
- A brief (600ms) status indicator appears near the top bar: "Your store is live" in Playfair Display italic, fading in and out
- Store URL appears in a `.neu-inset` panel that slides up from below the toggle, revealing the shareable link with a copy-to-clipboard affordance
- This entire sequence plays once on first publish. Subsequent toggles play the normal 250ms animation only.

**3. A Drop Selling Out**
When the last unit of a product is claimed/purchased.

Requirements:
- The product card transitions to a sold-out state in-place (no page reload)
- Badge transitions from active state to `badge--sold` with a 300ms cross-fade
- A subtle single-pulse shadow glow (maroon, 400ms, no repeat) emanates from the card
- If the Curator is viewing their dashboard, a notification slides in from the top with the sold-out item name

---

### 2.4 — The Micro-feedback Standard

Reference: Superhuman's keyboard feedback. Notion's drag handle appearance. Linear's priority selector.

Every action in the product must produce a micro-response that confirms the system received the input. These are sub-300ms, sub-perceptible, but their collective absence is what makes products feel "flat."

**Required micro-feedbacks (non-exhaustive):**

| Action | Micro-feedback |
|---|---|
| Copy a link or code | Button icon flips from copy to checkmark, returns in 1.5s |
| Toggle a chip/filter | Chip presses in (inset shadow) before rising to active (raised shadow) — creates a "click" sensation |
| Submit a form field | Field border brightens briefly (accent color at 30% opacity, 200ms fade) on valid input |
| Long press on a product card | Card scale subtly increases to 1.02 at 300ms, communicating a context menu is available |
| Swipe-to-dismiss a notification | Shadow reduces proportionally with swipe distance before releasing |
| Pull-to-refresh | Custom pull indicator using the Trovéa `—` dash, stretching vertically with pull distance |
| Error on form submission | Field shakes horizontally 3px × 3 oscillations at `var(--dur-fast)` |
| Price field input | ₦ symbol appears as prefix the moment the field receives focus, before the user types |

---

## Part III — Layout Quality Standards

### Reference: Net-a-Porter, Frame Denim, Highsnobiety, Apple product pages

---

### 3.1 — The Information Hierarchy Standard

**Goal:** A user should be able to identify the single most important action on any screen within 1.5 seconds, without reading.

This is tested by blurring any screen to 80% and asking: what is the focal point? If there is no clear answer, the hierarchy is broken.

**Hierarchy rules by screen type:**

**Commerce screens (product cards, store front):**
- One dominant visual (product image) occupying minimum 40% of card height
- One price — the highest visual weight text on the card
- One primary CTA — must contrast against the card surface enough to be seen blurred
- Everything else (category, stock, description) is secondary and must not compete with the above three

**Operational screens (Ledger, Archive, Dashboard):**
- One status summary at the top — total outstanding, active items count, or next event time
- The most urgent item in any list must be visually distinguished from items of lower urgency (unread indicator, accent border, elevated shadow)
- Bulk actions must only appear when there is a selection — they must not occupy space when idle

**Onboarding / Setup screens:**
- One question per screen. No exceptions.
- Progress is communicated through a top-bar progress track, not step counters ("Step 3 of 7")
- The illustration or visual anchor on each screen must reinforce the question being asked

---

### 3.2 — The Mobile Layout Standard

Trovéa is a mobile-first product. The desktop is secondary. Every layout decision defaults to the mobile constraint.

**Grid and spacing:**
- Horizontal padding: 20px on mobile, 40px on tablet+
- Card gutters: 16px vertical on lists, 14px on grids
- Bottom nav clearance: all scrollable content must add `padding-bottom: 96px` — the nav overlay must never cut content
- Safe area: all fixed bottom elements must account for iOS home indicator (`env(safe-area-inset-bottom)`)

**Thumb reach zones (mobile):**
- Primary CTAs must live in the bottom 40% of the viewport — within thumb reach for right-handed users
- Destructive actions (Drop Course, Delete Item) must be in the far-bottom secondary zone, never in the natural thumb arc
- The most-used action on any screen must be reachable without shifting grip. Test with a 375px viewport.

**Card sizing:**
- Product cards in single-column view: `min-height: 380px` (image-heavy, immersive)
- Product cards in two-column grid: `min-height: 220px` (compact, browsable)
- Dashboard stat widgets: `min-height: 120px`
- List row items (Ledger, notifications): `min-height: 72px`

**Minimum touch targets:** No interactive element smaller than 44×44px. For icon-only buttons, the tap target must be 44×44px even if the visual is smaller — use padding.

---

### 3.3 — The Whitespace Standard

Reference: Bottega Veneta's website. Frame Denim's product grid. Apple's product pages.

The neumorphic surface system requires breathing room to function. Surfaces that are crowded against each other lose their three-dimensional quality — the shadows merge and the raised/inset distinction disappears.

**Rules:**
- Minimum 16px between any two raised surfaces
- Minimum 24px between a raised surface and the page edge
- Within a card, content must never touch the card border — minimum 20px internal padding on all sides
- Section headings must have minimum 32px above them and 16px below
- The page must have intentional negative space — at least 20% of any screen's area should be the background parchment showing

**The test:** hide all content elements and look only at the background showing through. The shapes of negative space should look intentional — not random gaps where elements didn't fit.

---

### 3.4 — The Typography Layout Standard

**Hierarchy must be readable in Playfair at small sizes.** The system uses a serif for headings — this is intentional and premium, but requires discipline. Playfair Display becomes illegible below 16px on body text. Never use `.t-display` or `.t-headline` for anything that must be read quickly (status labels, error messages, action confirmation).

**Line length:**
- Body copy (`.t-body-lg`, `.t-body`): max 65 characters per line. Wider than this and the eye struggles to track from line end to line start.
- Single-column content: `max-width: 560px` centered
- Two-column content: each column `max-width: 340px`

**Orphans and widows:**
- No single-word last lines on paragraph text. Use `text-wrap: balance` (Chrome 114+) on headings and short labels.
- Price + currency must always be on the same line — `₦85,000` must never break across lines.

**Number display:**
- All prices use tabular number spacing (`font-variant-numeric: tabular-nums`) so price columns align vertically in lists
- Large stat numbers (dashboard widgets) use `font-variant-numeric: oldstyle-nums` in Playfair Display for editorial quality

---

## Part IV — Language Quality Standards

### Reference: Stripe, Linear, Notion, Superhuman

Language is design. Every word in Trovéa's UI is a product decision. The current state of most SaaS products is generic, corporate, and forgettable. Trovéa's language should feel like it was written by someone who actually uses the product.

---

### 4.1 — Voice & Tone Principles

**The voice is:** Assured. Warm. Precise. Culturally literate. Never corporate. Never startup-cringe. Never over-explains.

**The tone shifts by context:**
- Dashboard, Ledger, operational tools: **concise and factual** — "3 payments pending" not "You have 3 outstanding payments that need your attention"
- Onboarding, first-time moments: **warm and inviting** — "Your store is ready" not "Setup complete"
- Error and failure states: **direct and actionable** — "Payment not found. Check the amount and try again." not "An unexpected error occurred. Please try again later."
- Ceremony moments (Seal issuance, first drop, milestones): **elevated and precise** — "Sealed. Receipt TRV-0047 is permanent." not "Receipt created successfully!"

---

### 4.2 — Language Rules

**Rule 1: Never say "successfully."**
"Payment marked as paid" is better than "Payment marked as paid successfully." The action implies success. The adverb is noise.

**Rule 2: Name things as a Curator would name them.**
Not "Create a product listing." → "Add an item."
Not "Generate receipt." → "Seal it."
Not "View transaction history." → "Your Ledger."
Not "Store settings." → "Your Store."
Not "Activate store." → "Go live."
Not "Deactivate store." → "Go dark."

**Rule 3: Amounts are always formatted. Always.**
Never display raw numbers in the UI. `₦85000` is wrong. `₦85,000` is right. Build the formatter into the component layer — no amount should ever render without going through the Naira formatter.

**Rule 4: Time is human.**
Not "2025-11-14 09:42:33." → "Today, 9:42 AM."
Not "3600 seconds ago." → "1 hour ago."
Not "Last active: 2 days ago." → "Active 2 days ago."
Relative time within 24 hours. Day name for within the week ("Tuesday, 3:20 PM"). Date only beyond 7 days ("Nov 14").

**Rule 5: Empty states tell a story.**
Not "No items found." → "Nothing here yet. Add your first item and it will live here."
Not "No transactions." → "Your Ledger is empty. It fills up the first time you seal a receipt."
Not "No notifications." → "You're all caught up."
Every empty state should either give context (what this space is for) or a path forward (how to fill it).

**Rule 6: Errors explain, not apologize.**
Not "Something went wrong. Please try again." → "Couldn't save your item. Check your connection and try again."
Not "Error 400." → "That price doesn't look right — enter a number above 0."
Never use "Oops." Never use "Uh oh." These read as either infantile or dismissive.

**Rule 7: CTAs are verbs, not nouns.**
Not "Confirmation." → "Confirm."
Not "Payment." → "Mark as Paid."
Not "Receipt." → "Seal it."
Not "Publication." → "Go Live."
Every button label must be a verb unless it is navigational (e.g. "Your Ledger" as a tab label is acceptable).

**Rule 8: Don't state the obvious.**
Not "Tap the button below to continue." → (the button speaks for itself)
Not "You are about to delete this item." (on a delete confirmation) → "Delete [Item Name]? This can't be undone."
Remove any sentence that would feel condescending if said out loud.

---

### 4.3 — Placeholder Language Standard

Placeholders in input fields must demonstrate understanding of how a Curator actually uses the field, not describe the field generically.

| Field | Bad placeholder | Good placeholder |
|---|---|---|
| Store name | "Enter store name" | "e.g. Adaeze Finds" |
| Item caption | "Enter description" | "Paste a WhatsApp caption to auto-fill" |
| Price | "Enter price" | "e.g. 85000" |
| Store handle | "Enter handle" | "@yourstore" |
| Booking duration | "Enter duration" | "e.g. 90 mins" |
| Payment note | "Enter note" | "e.g. Opay to 0812..." |

---

### 4.4 — Notification Language Standard

Notifications must be written from the Curator's perspective, not the system's. The system observed something — the notification tells the Curator what it means for them.

**System perspective (wrong):**
"Transaction #TRV-0047 status updated to: Pending"

**Curator perspective (right):**
"Ada Okafor hasn't paid. ₦85,000 · 2 hours ago."

**Format:**
Line 1: What happened, in plain language. One sentence. Max 60 characters.
Line 2: Amount + time, or next action. Max 48 characters.
Action link: "Tap to [verb]" in DM Mono at 9px ghost.

---

## Part V — UX Flow Quality Standards

### 5.1 — The Zero-State Quality Standard

A zero-state (empty store, no items, no transactions) is not a bug or a temporary condition to work around — it is the user's first impression of the platform.

**Goal:** A Curator who opens Trovéa for the first time, with a complete zero-state, should understand within 10 seconds: (1) what their store will look like, (2) what they need to do to get there, and (3) that the platform has good taste.

**Zero-state requirements:**
- The background parchment texture is visible and beautiful — this alone communicates premium
- A single gentle prompt occupies the center of each empty section — not a form, just an invitation
- The invitation uses the Curator's store type context (Collector sees "Add your first piece." Vendor sees "Post your first menu." Host sees "Add your first service.")
- No onboarding checklists visible until the Curator has completed at least one action — checklists on zero-state feel presumptuous
- No tutorial videos, no modal walkthroughs, no forced tours — Trovéa's UI should be discoverable without instructions

---

### 5.2 — The Three-Tap Rule

Reference: how Apple designs primary workflows in iOS.

**Goal:** Any action a Curator performs more than once per session must be completable in three taps or fewer from the dashboard.

**Measured flows:**
| Action | Current estimated taps | Target |
|---|---|---|
| Mark a payment as paid | Unknown | ≤ 3 |
| Add a new item | Unknown | ≤ 3 |
| Share store link | Unknown | ≤ 2 |
| Open/close store | Unknown | ≤ 1 |
| Issue a receipt | Unknown | ≤ 4 (ceremony justifies +1) |
| View pending payments | Unknown | ≤ 2 |
| Cap a drop / change stock | Unknown | ≤ 3 |
| Accept a claim | Unknown | ≤ 2 |

Any flow that exceeds these targets must be restructured before shipping, not optimized post-launch.

---

### 5.3 — The Confirmation Pattern Standard

Trovéa has three classes of action: reversible, partially reversible, and permanent. Each class requires a different confirmation pattern.

**Class A — Reversible (undo available):**
No confirmation required. Action executes immediately. An undo affordance appears in a toast for 6 seconds.
Examples: marking an item as available/unavailable, editing a caption, changing a price.

**Class B — Partially reversible (affects ongoing transactions):**
Single-step confirmation: a bottom sheet with the action summary and a primary CTA in maroon.
The sheet presents the consequence in plain language: "This will close 3 pending claims. They'll be notified."
Examples: closing claim mode, taking an item offline while it has pending orders, changing a service price mid-booking.

**Class C — Permanent (cannot be undone):**
Two-step confirmation: (1) bottom sheet with consequence + input field requiring the Curator to type the item name or "DELETE" + confirm button. (2) Confirm button is disabled until the typed value matches exactly.
The input field is `.input-velvet` styled (regardless of current theme) — the visual register shift communicates gravity.
Examples: deleting an item with its full receipt history, closing a store permanently, cancelling a confirmed booking.

**Rule:** Never use a system `confirm()` dialog. It is generic, unbranded, and breaks the immersion of every premium interface. Trovéa's confirmations are part of the product experience.

---

### 5.4 — The Error Recovery Standard

**Goal:** When something goes wrong, the user must always know what went wrong, whether it was their fault or the system's, and exactly what to do next.

**Error state anatomy:**
1. **Surface:** The error state must appear on the same surface as the action that failed — not in a generic toast. A form error appears on the form. A network error on a load operation appears where the content was supposed to load.
2. **Attribution:** "Couldn't save." (system fault) vs. "Price must be above ₦0." (user input fault). The language must accurately attribute the error source.
3. **Recovery path:** Every error state has exactly one primary recovery action. It is a button (not a link). It reads as a verb.
4. **Persistence:** Errors that require user correction persist until corrected. Errors that were transient (network hiccup) clear automatically after 1 resolved retry.

---

## Part VI — Persona Store Type Quality Goals

Each Curator type has a distinct flow that represents their core daily use of the product. These are the flows that must feel flawless. If any of these flows has friction, that Curator has no reason to use Trovéa over Instagram DMs.

---

### 6.1 — Adaeze · The Collector · Drop Flow

**Core flow:** Prepare Friday drop → publish at 6pm → manage incoming demand → close or sell out.

**Quality goals specific to Adaeze:**

**The Drop Countdown**
When a drop has a scheduled publish time, the store's internal dashboard must show a live countdown. Not a date string — a countdown. `HH:MM:SS` in DM Mono at 24px. The visual weight of this timer communicates to Adaeze that the event is real and tracked. The timer turns maroon at T-30 minutes.

**The Publish Moment**
When the scheduled time arrives and the drop goes live: the toggle transitions to live state with the 1.5× ceremony animation. A distinct push notification fires ("Your drop is live. 14 items available."). The dashboard briefly shows a live visitor count if more than 1 buyer is viewing simultaneously — this is the "event" sensation.

**Demand Management**
When 3 or more people claim the same item: the item card in Adaeze's archive gains a `surface-amber` treatment indicating demand. Not just a badge — the entire card surface warms visually. This communicates scarcity without Adaeze having to count anything.

**The Friday Rule**
The UI must learn that Adaeze drops on Fridays (after two observed drops). The "Schedule Drop" flow surfaces a default time suggestion of "This Friday, 6:00 PM" — she confirms or adjusts. This specificity makes the platform feel like it knows her.

**Sold Out Sequence**
When Adaeze's last item sells: the dashboard transitions to a quiet post-drop summary view. Total revenue, items sold, number of new buyers. Playfair Display numbers. A single CTA: "Share your results" (generates a beautifully designed image card for Instagram Stories). This is the emotional payoff for Friday chaos.

---

### 6.2 — Tobi · The Vendor · Pre-Order Window Flow

**Core flow:** Open pre-order window → cap fills up → window closes → cook → fulfill → go dark.

**Quality goals specific to Tobi:**

**The Window State**
Tobi's store has three distinct visual states: Dark (closed), Open (accepting orders), and Locked (cap reached, not accepting new orders). These states must be visually unambiguous — not just toggled via a chip or badge, but through the actual texture and color of the storefront. Dark mode: the entire storefront surface deepens toward `.section-velvet`. Open mode: bright parchment, maroon accents, full visibility. Locked mode: parchment with a gold surface-amber treatment on the header, "Cap reached" badge prominent.

**The Cap Tracker**
The most important number in Tobi's dashboard is not revenue — it is the ratio of claimed orders to maximum cap. This number must be displayed as both a progress bar and a human-readable fraction (`6 / 10 orders`) at the top of his order view at all times when the window is open. When the cap reaches 80%, the progress bar transitions to `progress-fill--gold`. At 100%, the bar fills fully, the window auto-locks, and a ceremony animation confirms the lock.

**The Midnight Close**
Tobi closes at Friday midnight. The system must support scheduled window close times. When the close time arrives, an automated sequence: (1) new order button disables, (2) a quiet system notification to all buyers who haven't paid confirms their order is reserved, (3) Tobi's dashboard shows a locked summary. No action required from Tobi.

**Order List for Fulfillment**
On Saturday morning, Tobi needs a fulfillment checklist — not a Ledger view, not a transaction history. A list ordered by pickup time, with buyer name, items ordered, and payment status. Each row has a single large checkbox. Checking it marks the order fulfilled. This view is a distinct mode: "Fulfillment View" toggled from the standard Ledger.

---

### 6.3 — Chisom · The Host · Booking Flow

**Core flow:** Buyer discovers service → selects service + slot → pays deposit → Chisom confirms → appointment happens → receipt issued.

**Quality goals specific to Chisom:**

**The Availability Calendar**
Chisom's schedule is her most important asset. The calendar view in her store must show availability with honest visual density — not a generic calendar with dots, but a view where each day clearly communicates: Available (open slots visible), Partially booked (some slots gone), Fully booked (day greyed out with a subtle `.neu-inset` treatment). Chisom must be able to block days off in two taps (long press day → "Block this day" bottom sheet → confirm).

**The Service Menu**
Each service Chisom offers is a card in her store — not a list item, a card. The card shows: service name (Playfair Display), duration (DM Mono), deposit required (bold, maroon), and a "Book" CTA. Service cards are reorderable via drag-and-drop. The order Chisom sets is the order buyers see. This is the "curated" experience — she controls the narrative of her menu.

**Deposit Protection**
The deposit amount on a booking confirmation must be visually prominent — this is Chisom's income protection. On the buyer-facing booking flow, the deposit amount should appear in `.text-foil` treatment (gold gradient). Not because it's a prestige number, but because it must register as a serious commitment before the buyer confirms.

**The No-Show Protocol**
When a booked appointment passes its start time without a confirmed arrival: the appointment card in Chisom's view enters a "No-show alert" state — `surface-amber` background, with a "Mark no-show / Mark arrived" prompt. If Chisom marks no-show, the deposit is automatically recorded as retained and a receipt for the deposit amount issues. This flow must be completable in two taps.

**The Fully Booked Badge**
When Chisom's calendar is full for the next 14 days: her public store profile gains a "Fully Booked" badge in gold. This is not a limitation — it is social proof. The badge communicates demand and protects Chisom from enquiries she can't fulfill.

---

### 6.4 — Femi · The Digital Creator · Product Drop Flow

**Core flow:** Package digital product → set price + drop mechanics → go live → buyer pays → file delivers → revenue tracked.

**Quality goals specific to Femi:**

**The Product Packaging View**
Femi's items are files, not physical goods. The product card for a digital item must communicate this clearly and with pride — not just a file icon, but a designed preview tile. If the item includes a cover image, it displays full bleed. If no image is uploaded, the system generates a typographic placeholder using the item name in Playfair Display on a surface-amber background. Femi's store must never show empty grey boxes for digital products.

**The Instant Delivery Confirmation**
When a buyer purchases a digital product, the delivery must feel instant and ceremonial. The buyer's receipt includes a prominent "Download your files" button in gold. The button is large, centered, and uses `.btn--gold`. After first download, it becomes a ghost button with "Downloaded" state. Femi sees the delivery confirmed in his Ledger with a ✓ mark distinct from regular paid indicators.

**Bundle Mechanics**
Femi sells bundles (e.g., Lightroom Preset Pack + Notion Dashboard = Brand Starter Kit). A bundle must be creatable from existing items — selecting 2+ items and pressing "Create Bundle" opens a sheet where he sets the bundle price, name, and cover. Bundle items remain individually available unless Femi disables them. The bundle discount (calculated automatically from individual prices) is shown prominently on the bundle card as a savings badge.

**The Launch Mechanics**
Femi thinks in drops. A digital product can be set to a specific launch time, exactly like Adaeze's physical drops. Before launch: the product page shows a countdown on both the buyer-facing store and Femi's dashboard. At launch: the standard drop ceremony plays. The distinction is that Femi's drops are unlimited quantity by default — no cap unless he sets one.

**Revenue Dashboard (Creator View)**
Femi sells globally and cares about cumulative revenue differently from Tobi (per-window) or Chisom (per-appointment). His dashboard must show: total all-time revenue, this month's revenue, and a simple day-by-day bar chart for the last 30 days. The bars are rendered in the parchment surface system — bars are raised neumorphic columns, not flat colored rectangles. The chart must read beautifully without gridlines.

---

### 6.5 — Ngozi · The Studio · Portfolio & Enquiry Flow

**Core flow:** Buyer discovers portfolio → views work → initiates enquiry → Ngozi responds with package options → buyer selects + pays deposit → project begins.

**Quality goals specific to Ngozi:**

**The Portfolio View**
Ngozi's store is primarily a portfolio. The grid must support full-bleed photography without compression artifacts or aspect ratio distortion. Images must display in their native aspect ratio (not cropped to a uniform square). The grid alternates between a 1-column hero and a 2-column compact format — editorial, not uniform. Ngozi sets her hero image; everything else arranges itself.

**The Project Packages Card**
Ngozi doesn't sell items — she sells scopes of work. Each package is presented as a `.neu-surface` card with: package name (Playfair Display, 22px), duration ("1 day", "Half day", "Retainer"), deliverables list (clean Inter 14px, 4-item max visible with "+2 more" expansion), and a deposit CTA. Packages can be shown/hidden by Ngozi per season or enquiry type. The card must communicate expertise and professionalism without looking like a SaaS pricing table.

**The Enquiry Intake Form**
When a buyer clicks "Enquire," they complete a structured form: occasion/project type, preferred date range, location, and a free-text brief. This form is not a generic contact form — it uses Trovéa's styled fields with Chisom-level visual quality. On submission, Ngozi receives a structured notification that pre-fills her reply — she never starts from zero. The notification shows: project type, date, budget hint from the package they looked at before enquiring.

**The Brief-to-Receipt Pipeline**
Ngozi's full workflow ends at The Seal. When a project is confirmed and deposit paid, a receipt issues — but for Ngozi, the receipt format includes project scope, not just item name and price. "Brand shoot — 4 hours, 40 edited selects. Deposit: ₦50,000." The receipt is the contract summary. It must be designed to be forwarded to the client as a record of what was agreed.

---

## Part VII — Visual Quality Benchmarks

These are measurable, testable standards for the visual execution. They are not subjective. Claude Code should implement automated checks for as many of these as possible.

---

### 7.1 — Shadow Consistency Audit

Every `box-shadow` value in the codebase must use CSS custom properties — `var(--neu-raise)`, `var(--neu-raise-lg)`, `var(--neu-raise-sm)`, `var(--neu-inset)`, `var(--neu-inset-sm)`, or theme-specific variants. Any hardcoded shadow value is a bug.

**Pass condition:** `grep -r "box-shadow:" src/ | grep -v "var(--"` returns zero results.

---

### 7.2 — Color Token Audit

No hex value should appear in any component file. All colors are CSS custom properties.

**Pass condition:** `grep -rE "#[0-9a-fA-F]{3,6}" src/components` returns zero results (excluding comment blocks and the design token definition file).

---

### 7.3 — Touch Target Audit

Every element with an `onClick` or `onPress` handler must have explicit minimum dimensions of 44×44px. This is the Apple HIG standard and it applies to Trovéa without exception.

**Pass condition:** automated accessibility test using `axe-core` or `jest-axe` with touch target size rule enabled returns zero violations.

---

### 7.4 — Typography Conformance Audit

No font family, font size, or font weight should be set inline unless it is within a component that explicitly documents the exception. All typography must come from the defined class system.

**Pass condition:** `grep -r "font-family:" src/components | grep -v "var(--font"` returns zero results.

---

### 7.5 — Animation Performance Standard

**Goal:** 60fps on Samsung Galaxy A-series running Chrome Android. No jank on page transitions. No layout recalculation during animation.

**Rules:**
- Only `transform` and `opacity` are animatable properties. Never animate `width`, `height`, `top`, `left`, `padding`, `margin`, or `background-color` with transitions.
- Exception for `background-color` state changes: allowed at `var(--dur-instant)` (80ms) for button states only, where the snap is imperceptible.
- All animations must include `will-change: transform` on elements that animate on interaction (not on page load — this causes memory consumption).
- Use `contain: layout style` on animated card containers to prevent cascade.

**Pass condition:** Chrome DevTools Performance panel shows no frames below 55fps during any interaction animation on a simulated mid-tier Android device.

---

### 7.6 — Loading State Coverage

Every data-dependent component must have an explicit loading state. No component is permitted to render empty or broken while waiting for data.

**Required loading states:**
- Product card grid → skeleton cards using `.neu-surface` with shimmer bars
- Ledger list → skeleton rows at correct height
- Dashboard stats → skeleton widgets with animated shimmer
- Store profile header → skeleton showing correct layout proportions
- Receipt detail → skeleton receipt with correct maroon header silhouette

**Pass condition:** When network is throttled to "Slow 3G" in Chrome DevTools, no component renders as empty or shows raw unstyled content at any point during load.

---

### 7.7 — The Screenshot Test

The product must be screenshot-worthy at any point in a user's session. This is not a vanity metric — it is a distribution mechanism. Curators who are proud of how their store looks will screenshot it. Those screenshots will be marketing.

**Test protocol:**
1. Create a store with 6 items, 3 sold, 2 pending payment
2. Open the storefront on a 375px viewport
3. Take a screenshot without scrolling
4. The screenshot should be usable as a product marketing image without modification

If the above screenshot requires cropping, color correction, or "ignore that part" explanation — the layout quality has failed.

---

## Part VIII — Revenue-Focused Quality Goals

These are outcomes the quality of the product must drive. They are not metrics to A/B test — they are design intents that inform every decision.

---

### 8.1 — The Buyer Trust Signal

**Goal:** A first-time buyer visiting a Trovéa storefront must feel more confident making a purchase than they would via Instagram DMs.

The specific trust signals that must be present on every Curator's public storefront:
1. The Trovéa trust bar (receipts issued, member since, active items, last active)
2. At least one completed Seal visible on the storefront (proof of past transaction)
3. The Curator's store handle clearly linked to their Instagram/social (Trovéa verifies the link exists)
4. A clear payment method indicator — buyer knows before clicking "Enquire" whether this seller accepts Opay, bank transfer, etc.

**The ghost-buyer test:** if a user has never heard of Trovéa, opens a Trovéa storefront link from WhatsApp, and sees the product — they should understand within 3 seconds that this is a legitimate commerce platform, not a personal website or scam page.

---

### 8.2 — The Curator Retention Signal

**Goal:** Curators who issue at least 3 Seals in their first two weeks have a significantly higher 90-day retention than those who don't. The product design must accelerate reaching that threshold.

Design implications:
- The Seal issuance flow must be the fastest, most polished flow in the entire product — faster than adding an item, faster than setting up the store. If issuing a receipt is ever the bottleneck, Curators will return to WhatsApp.
- After a Curator's first Seal, a quiet moment of acknowledgment appears: "Your first receipt. It lives here forever." One line. Cormorant Garamond italic. No buttons. It disappears on next interaction.
- The dashboard must always surface the "easiest next action" contextually — if no items have been added, the empty state prompts adding. If items exist but no receipts, the Morning Brief says "Ready to seal your first receipt?" If receipts exist, the focus shifts to the Ledger.

---

### 8.3 — The Premium Perception Signal

**Goal:** Trovéa's visual quality must communicate that the platform charges less than it's worth. Buyers and Curators must feel like they found something valuable.

Design implications:
- The onboarding design must be as polished as the product itself. The moment a Curator sees their first screen, the production value must be apparent.
- Typography must be flawless. No orphaned words on headings. No widowed lines in descriptions. No raw currency numbers without formatting.
- The Seal card must be beautiful enough to share. It must look like something a Curator is proud to send. If a buyer receives a Seal and thinks "this looks like a receipt from a generic app" — Trovéa has failed.
- The storefront must look like it cost more to build than it did. A Collector who sees a competitor's Trovéa store and feels slightly envious of how professional it looks — that is the correct reaction.

---

## Part IX — Recognition Quality Goals

These are the specific product moments that should generate word-of-mouth. They are designed into the product, not added afterward.

---

### 9.1 — The Shareable Moments

Every revenue-generating or milestone event must produce something the Curator wants to share.

**Mandatory shareable outputs:**

| Moment | Shareable artifact |
|---|---|
| Drop sells out | Auto-generated "Sold Out" image card with total items sold and revenue. Trovéa-branded, store-colored. |
| First Seal issued | A quiet acknowledgment screen designed to be screenshotted. Store name in Playfair Display. "First Receipt Sealed." Date. |
| Monthly revenue milestone | A one-screen summary: store name, revenue this month, receipts issued. Shares as a 9:16 image. |
| Fully booked (for Hosts) | A "Fully Booked" card with calendar silhouette. Designed for Instagram Story. |
| New buyer from a new city | A notification to the Curator: "Your first buyer from Port Harcourt." Small data. Big feeling. |

All shareable artifacts must be exportable as `PNG` without the user leaving the app. The quality of the rendered image must match what they see on screen.

---

### 9.2 — The Referral Quality Standard

When a Curator shares their store link and a new user lands on it for the first time, that landing experience is Trovéa's most important acquisition moment.

**The store link landing page must:**
1. Load in under 2 seconds on a 4G Nigerian network (this means aggressive image optimization and a skeleton that shows the store layout instantly)
2. Show the Curator's theme, not Trovéa's default — the first impression must be "this person has taste," not "this is another platform"
3. Have a subtle "Powered by Trovéa" attribution in the bottom-right corner — 9px DM Mono, ghost opacity — visible enough for curious buyers to notice, invisible enough not to interrupt the store experience
4. The attribution link opens Trovéa's curator signup, not the homepage

---

### 9.3 — The "Tell a Friend" Standard

A product that is shareable by design generates referrals without asking for them. Trovéa must never prompt "Refer a friend" in a modal or notification. The referral must happen because a Curator is proud of the product, not because they were asked.

**Design requirements:**
- Every screen in the product must be screenshot-worthy (see 7.7)
- The Seal must be beautiful enough that buyers forward it to others
- The storefront must be distinctive enough that buyers ask "how did you make this?"
- The shareable artifacts (see 9.1) must be designed at a quality level where Curators want to post them without cropping out the Trovéa branding

---

## Part X — The Quality Review Checklist

Use this before any feature is considered complete. Claude Code should run automated checks for every testable item. Human review is required for subjective items.

### Automated checks
- [ ] All shadow values use CSS custom properties
- [ ] No hardcoded hex colors in component files
- [ ] All interactive elements have ≥ 44×44px touch targets
- [ ] All font references use CSS custom properties
- [ ] No `width`, `height`, `top`, `left` in animation/transition properties
- [ ] All animated elements have `will-change: transform` (interaction-triggered only)
- [ ] Every data-dependent component has an explicit loading state
- [ ] All price values pass through the Naira formatter
- [ ] All time values pass through the relative time formatter
- [ ] No `confirm()` dialogs in the codebase

### Human review
- [ ] **The blur test:** blur any screen to 80% — the primary CTA is still identifiable
- [ ] **The screenshot test:** screenshot any screen — it is usable as a marketing image without modification
- [ ] **The three-tap test:** the core action for this screen's Curator type is completable in ≤ 3 taps
- [ ] **The language test:** every string in this feature could have been written by a Curator, not a software engineer
- [ ] **The empty state test:** the zero-state for this feature looks intentional and tells a story
- [ ] **The ceremony test:** no non-ceremonial element uses `--dur-ceremony` timing
- [ ] **The material test:** pressing any interactive surface produces a physically believable response within 80ms
- [ ] **The context test:** error messages attribute the error correctly (system fault vs. user fault) and provide exactly one recovery action
- [ ] **The Seal test:** issue a receipt in this version — the ceremony must land with full weight
- [ ] **The persona test:** run the core flow for the relevant Curator type — complete it without hesitation or confusion

---

> Quality is not a phase. It is not a pass at the end of a sprint. Every decision made during the mock phase either deposits into or withdraws from the quality bank. The goal of this document is to make the exchange rate explicit — so that shortcuts are recognized as shortcuts, not accepted as defaults.