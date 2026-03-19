# Trove'a — Curator Personas

Every product decision is evaluated against these five fictional Curators.
When building a feature, ask: does this serve the right persona? Does it frustrate another?

---

## 01 · Adaeze Nwosu — The Collector
**Store Type:** `collector` · Lagos (Lekki) · @adaeze.finds

> "My store is my taste made tangible."

**Business model:** Thrift-and-lifestyle store. Sources deadstock from Yaba market and hauls from Accra. Drops new inventory every Friday evening. ~4,200 Instagram followers, ~600 loyal repeat buyers.

**Primary pain:** Friday drop chaos. 200+ DMs asking "is this available?". Managing orders across Instagram DMs and a shared Google Sheet that is always one mistake away from disaster.

**Design test:** Does this feature make Adaeze's Friday drop feel like an event — and protect her from chaos after it goes live?

**Commerce model:**
- Physical items with stock levels
- Drop scheduling (items go live at a specific datetime)
- Claim mode for premium/limited pieces
- WhatsApp as primary sales channel ("Chat to Buy")
- Bag feature for multi-item orders

**Key pages:** Archive (items + Drops tab), Storefront (product grid + drop countdown), Terminal (inventory select → issue Seal)

**Storefront sections:** Header, Hero (optional), Drop Countdown (when upcoming), Featured, Product Grid, About, Contact

**Archive item fields:** name, price, stock_level, images, collection, tags, claim_mode
**Unique Archive behaviour:** Smart Paste ingestion; stock countdown on storefront; Drop scheduling tab

---

## 02 · Tobiloba Adeyemi — The Vendor
**Store Type:** `vendor` · Ibadan (Bodija) · @tobi.eats.ibadan

> "My store is an event, not a place."

**Business model:** Weekend food business. Saturday set menu (jollof, peppered snail, small chops). Takes pre-orders until Friday midnight. Cooks Saturday morning. Pickups/deliveries 12–5pm. Dark by 6pm until next week.

**Primary pain:** Managing capped pre-orders across WhatsApp and Instagram DMs simultaneously without double-committing or overcooking. The store doesn't exist between windows.

**Design test:** Does this feature help Tobi run a tight, capped, time-boxed food drop without chaos — and stay dark cleanly between windows?

**Commerce model:**
- Time-windowed availability (open_at / close_at datetimes)
- Per-item quantity caps per window
- Pre-orders, not immediate purchase
- Store has 4 states: Open / Post-Window / Dormant / Upcoming
- Dormant state is a designed experience, not a failure state

**Key pages:** Schedule (window management), Storefront (window status + menu), Terminal (menu item select when window is open)

**Storefront sections:** Header, Hero (optional), Window Status + Menu Grid, About, Contact

**Archive item fields:** name, price, per-window quantity cap, images, category
**Unique Archive behaviour:** Cap enforced per window; item appears across windows with reset caps; no collections (categories instead)

**Store states and their storefront behaviour:**
- **Open (window active):** "Pre-order" CTA on each menu item; live cap counter shown
- **Post-Window (just closed):** Previous menu with all items marked "Window Closed"; last window stats shown ("X items sold")
- **Dormant (between windows):** Same as Post-Window but with "Next window: TBD" or next scheduled window date; "Follow for updates" WhatsApp/Instagram prompt
- **Upcoming (next window announced):** "Next window: Saturday 12pm" countdown; menu preview but no ordering yet

---

## 03 · Chisom Eze — The Host
**Store Type:** `host` · Abuja (Wuse 2) · @chisombeautyabj

> "My store is my clientele's sanctuary."

**Business model:** Lash technician and brow artist, home studio. Fully booked for 6 months — problem is not demand, it's management. 8 services at fixed prices with different durations. Works Tuesday–Saturday 9am–6pm. Requires deposit at booking.

**Primary pain:** All booking coordination happens through Instagram DMs, costing 1–2 hours daily and producing occasional double-bookings and no-shows she cannot enforce against.

**Design test:** Does this feature reduce the time Chisom spends managing bookings — and does it protect her income from no-shows and calendar chaos?

**Commerce model:**
- Slot-based appointments (duration drives slot-length calculation)
- Deposit required at booking (flat ₦ amount or % of service price)
- Schedule defines working days/hours/breaks; system computes available slots
- Store states: Accepting Bookings / Fully Booked / On Leave

**Key pages:** Schedule (calendar + availability config), Bookings (/bookings — 4 tabs), Storefront (service menu + slot picker)

**Storefront sections:** Header, Hero (optional), Service Menu + Booking CTA, Calendar Availability Preview, Portfolio Gallery (optional), About, Contact

**Archive item (called "Service") fields:** name, duration (mins), price, deposit_amount, deposit_required, description
**Unique Archive behaviour:** Duration drives slot-length calculation on calendar; deposit toggle per service; inactive toggle (not delete)

**Booking Seal fields (different from standard receipt):**
- "Booking Confirmation" heading (not "Receipt")
- Service name, date, time, duration
- Deposit paid (₦ amount) + balance due on arrival
- Curator's address or location link
- Cancellation policy (from Settings)

---

## 04 · Femi Ogundimu — The Digital Creator
**Store Type:** `digital_creator` · Lagos (Surulere) · @femicreates

> "My store is a download away from anywhere in the world."

**Business model:** Motion designer and Notion template builder. Sells Lightroom presets, After Effects project files, Notion dashboards, and a ₦12,000 Brand Starter Kit. Mix of Nigerian small business owners and international creatives. Currently on Gumroad but it doesn't reflect his brand.

**Primary pain:** Gumroad doesn't reflect his aesthetic, can't handle bundles natively, and has no launch mechanics for drops. Wants Naira-first pricing for Nigerian buyers.

**Design test:** Does this feature let Femi sell and deliver digital products beautifully — with the launch mechanics of a proper product drop?

**Commerce model:**
- Instant delivery on purchase (no stock concept — items are unlimited)
- Two asset types: public preview (shown on storefront) + private delivery (actual file, post-purchase only)
- Delivery methods: Direct download URL / Notion link / External link / Manual
- Free products (is_free = true) for lead generation
- Launch pricing: early_access_price active until early_access_cap sales reached
- Buyer email required for delivery (not WhatsApp)

**Key pages:** Catalogue (/catalogue — dedicated route, not /archive), Storefront (digital catalogue section), Terminal (select product + buyer email)

**Storefront sections:** Header, Hero (optional), Featured, Digital Catalogue, About, Contact

**Archive item (called "Product") fields:** name, price, delivery_url (private), preview_asset, delivery_method, is_free, early_access_price, early_access_cap
**Unique Archive behaviour:** Instant delivery on purchase; no stock; preview vs full asset split

**CTAs:**
- is_free = false: "Buy Now" → checkout → Seal issued → delivery link sent to buyer email
- is_free = true: "Download Free" → instant delivery without payment

**The Seal for Digital Creator:**
- Heading: "Purchase Receipt"
- Item section: "Products Delivered"
- CTA: "Explore More"

---

## 05 · Ngozi Abubakar — The Studio
**Store Type:** `studio` · Lagos (Yaba) · @ngozi.studio

> "My work speaks. My store gets me hired."

**Business model:** Brand photographer and creative director. Shoots for fashion brands, food businesses, personal brands. Project retainers and one-off shoot packages. Has a second shooter and editor. Portfolio scattered across Instagram, Behance, Wix.

**Primary pain:** Enquiries arrive across three channels simultaneously with no standard intake process. Every client interaction starts from zero. Current Wix site embarrasses her.

**Design test:** Does this feature make Ngozi look like the professional she is — and reduce the back-and-forth before a client commits?

**Commerce model:**
- Fixed-price packages: shown with "Book Package" CTA + deposit flow
- Custom-price packages: shown with "Request Quote" CTA → enquiry form
- Portfolio gallery is the primary trust signal (not a product grid)
- Each package can have a custom intake form (configurable fields per package)
- Store states: Open for Enquiries / Not Taking New Clients

**Key pages:** Archive (packages + services), Bookings (/bookings — enquiries + confirmed projects), Storefront (portfolio + service packages + enquiry form)

**Storefront sections:** Header, Hero (optional), Portfolio Gallery, Service Packages, Enquiry Form, About, Contact

**Archive item (called "Package" or "Service") fields:** name, price_type (fixed/custom), scope_description, deliverables, timeline_estimate, deposit_pct, intake_form_fields
**Unique Archive behaviour:** Custom quote path; enquiry form intake configurable per package

**The Seal for Studio:**
- Heading: "Project Brief"
- Issued by: "Studio name"
- Item section: "Package Scope"
- CTA: "View Portfolio"

---

## Store-Type Quick Reference Table

| | Collector | Vendor | Host | Digital Creator | Studio |
|---|---|---|---|---|---|
| Item called | Item | Menu Item | Service | Product | Package |
| Archive route | `/archive` | `/archive` | `/archive` | `/catalogue` | `/archive` |
| Schedule needed | ✗ (Drops tab) | ✓ (Windows) | ✓ (Calendar) | ✗ | ✗ |
| Bookings needed | ✗ | ✗ | ✓ | ✗ | ✓ |
| Dispatch needed | ✓ | ✓ | ✗ | ✗ | ✗ |
| Stock concept | ✓ | Per-window cap | Slot-based | ✗ | ✗ |
| Smart Paste | ✓ | ✓ | ✗ | ✗ | ✗ |
| Primary CTA | "Chat to Buy" | "Pre-order" | "Book a Slot" | "Buy Now" | "Book Package" |
| Buyer contact | WhatsApp | WhatsApp | WhatsApp + deposit | Email | WhatsApp |
| Receipt type | sale | order | booking | download | project |
| Receipt heading | Receipt | Order Receipt | Booking Confirmation | Purchase Receipt | Project Brief |

---

## Store State Models

### Collector
- **Live** — items available, normal storefront
- **All Sold Out** — all items sold_out or hidden; store still accessible
- **Upcoming Drop** — countdown shown; items show "Dropping [date]" instead of price

### Vendor
- **Open** — window active, pre-orders accepted, cap counter visible
- **Post-Window** — window just closed; previous menu visible with "Window Closed" labels; last window stats shown
- **Dormant** — between windows; fully designed experience (not dead)
- **Upcoming** — next window announced; menu preview without ordering

### Host
- **Accepting Bookings** — slots available, booking flow active
- **Fully Booked** — no available slots in the system; "Join waitlist" prompt
- **On Leave** — manually set; all CTAs disabled

### Digital Creator
- **Live** — always, unless products are all hidden
- **Coming Soon** — pre-launch state, email capture

### Studio
- **Open for Enquiries** — enquiry form active, packages bookable
- **Not Taking New Clients** — manually set; enquiry form disabled; WhatsApp contact remains