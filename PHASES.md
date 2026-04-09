Trovéa — Backend Scaffold Plan (Phase 3A → 3G)

 Context

 The app is a fixture-first React/TypeScript SPA
 transitioning to live Supabase. Auth, types,
 schema documentation, migrations skeleton, and
 partial query layer are all in place (~65%
 backend complete). The gap is: most form submits
 and status mutations only update Zustand local
 state, never writing to the DB. Public
 storefronts render hardcoded fixtures, not real
 merchant data. Claims, holds, and bookings have
 no persistence layer at all. Admin panel is fully
  fixture-backed.

 Each phase below begins with a Frontend Quality
 Audit that must be completed before any backend
 wiring starts in that phase.

 ---
 Key Files (reference throughout)

 File: supabase/migrations/001_initial_schema.sql
 Role: Ground truth for all table definitions
 ────────────────────────────────────────
 File: supabase/migrations/002_rls_policies.sql
 Role: RLS + existing RPCs (get_receipt_by_seal_id

   is here)
 ────────────────────────────────────────
 File: supabase/migrations/004_cron_jobs.sql
 Role: pg_cron: hold/claim expiry already defined
 ────────────────────────────────────────
 File: src/lib/supabase.ts
 Role: Client: db = supabase.schema('trovea')
 ────────────────────────────────────────
 File: src/lib/types/merchant.types.ts
 Role: Ground truth for TypeScript domain types
 ────────────────────────────────────────
 File: src/lib/db/queries/
 Role: Query layer (partial)
 ────────────────────────────────────────
 File: src/lib/store/terminal.store.ts
 Role: persistReceipt — overselling bug (no stock
   decrement)
 ────────────────────────────────────────
 File: src/lib/store/archive.store.ts
 Role: mintProducts / toggleProductStatus /
   updateProduct — store-only
 ────────────────────────────────────────
 File: src/lib/store/ledger.store.ts
 Role: mark* actions — store-only
 ────────────────────────────────────────
 File: src/lib/store/hold.store.ts
 Role: Entirely fixture-backed
 ────────────────────────────────────────
 File: src/lib/store/admin.store.ts
 Role: Entirely fixture-backed
 ────────────────────────────────────────
 File: src/pages/public/StorefrontPage/StorefrontP
 age.tsx
 Role: No DB fetch; hardcoded fixtures
 ────────────────────────────────────────
 File: src/pages/merchant/SettingsPage.tsx
 Role: handleSave() never calls DB

 ---
 Phase 3A — Pre-flight Fixes

 Goal: Close structural integrity gaps (type
 mismatches, missing migration pieces, broken
 dev-mode DB calls, auth bugs) before any live
 data flows. No user-visible feature changes.

 Frontend Quality Audit

 - src/lib/store/auth.store.ts:80 —
 onAuthStateChange listener leak: listener
 registered on every initSession() call with no
 unsubscribe stored. Fix: store the returned
 subscription and call subscription.unsubscribe()
 in signOut.
 - src/lib/store/auth.store.ts:59 — signOut calls
 supabase.auth.signOut() then set({
 isAuthenticated: false }) inline — fine, but if
 the listener is still registered it will also
 fire SIGNED_OUT event. Decide on one source of
 truth: either the listener handles state reset,
 or signOut does it inline. Remove duplication.
 - src/App.tsx:96–98 — In !hasEnv branch,
 initFromDB('merchant-001') is called for archive
 and ledger stores. These hit
 https://placeholder.supabase.co, fail silently,
 and are unnecessary since stores already have
 fixture defaults. Remove both calls from the
 !hasEnv branch.
 - src/App.tsx:112 — console.error('Failed to load
  merchant data:', err) is silent to the user.
 Replace with
 useUIStore.getState().addToast('Failed to load
 store data', 'error').
 - src/App.tsx:242 — Admin routes wrapped in
 <RequireAuth> only, no role check. Document with
 // TODO Phase 3G: add RequireAdmin comment.
 - src/lib/types/merchant.types.ts — Merchant
 interface is missing is_suspended: boolean. The
 DB column exists. Add it.

 Migrations

 New file: supabase/migrations/006_missing_columns
 _and_rpcs.sql
 -- Add columns present in TS types but absent
 from 001 schema
 ALTER TABLE trovea.merchants
   ADD COLUMN IF NOT EXISTS has_gone_live BOOLEAN
 NOT NULL DEFAULT false,
   ADD COLUMN IF NOT EXISTS first_seal_issued
 BOOLEAN NOT NULL DEFAULT false;

 UPDATE trovea.merchants SET has_gone_live = true
 WHERE store_open = true;

 -- Atomic stock decrement RPC (used by Phase 3C
 terminal)
 CREATE OR REPLACE FUNCTION
 trovea.decrement_stock(p_product_id UUID,
 p_quantity INTEGER DEFAULT 1)
 RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
 SET search_path = trovea AS $$
 BEGIN
   UPDATE trovea.products
   SET stock_level = GREATEST(0, stock_level -
 p_quantity),
       status = CASE WHEN GREATEST(0, stock_level
 - p_quantity) = 0 THEN 'sold_out' ELSE status
 END,
       updated_at = NOW()
   WHERE id = p_product_id AND stock_level IS NOT
 NULL AND stock_level > 0;
 END;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.decrement_stock(UUID, INTEGER) TO
 authenticated;

 Query Layer

 New file: src/lib/db/queries/profiles.ts
 - getProfile(userId: string): Promise<Profile |
 null>
 - upsertProfile(data: Partial<Profile> & { id:
 string }): Promise<boolean>

 Store Changes

 - src/lib/store/auth.store.ts — Store
 onAuthStateChange subscription reference. Call
 subscription.unsubscribe() at the start of
 signOut (before supabase.auth.signOut()).
 - src/lib/store/onboarding.store.ts:55 — Replace
 raw .from('profiles').upsert() with
 upsertProfile() from the new query file.

 Acceptance Criteria

 - Migration 006 runs cleanly; merchants has
 has_gone_live + first_seal_issued;
 decrement_stock RPC is callable
 - Merchant TS type has is_suspended: boolean
 - initSession() called twice (Strict Mode)
 registers only one auth listener
 - Dev mode (!hasEnv) no longer fires DB calls on
 startup
 - App-level merchant load errors show a toast

 ---
 Phase 3B — Core Reads: Storefront

 Goal: StorefrontPage, ItemDetailPage, and
 ReceiptPage serve real data from the DB. Dev
 fixture fallback preserved when
 !VITE_SUPABASE_URL.

 Frontend Quality Audit

 - src/pages/public/StorefrontPage/StorefrontPage.
 tsx — Locate all top-level fixture imports
 (FIXTURE_MERCHANT, FIXTURE_PRODUCTS, etc.) and
 all hardcoded merchant-001 references. List every
  place that must be replaced with fetched state.
 - src/pages/public/StorefrontPage/StorefrontPage.
 tsx — Confirm no loading skeleton exists. Design
 and add a <StorefrontSkeleton /> to render during
  the merchant/product fetch.
 - src/pages/public/ItemDetailPage.tsx — Verify it
  uses useParams for item_id. Confirm whether it
 calls any DB fetch or is entirely fixture-based.
 - src/pages/public/ReceiptPage.tsx — Confirm
 whether getReceiptBySealId is actually called in
 a useEffect or if the page still finds the
 receipt in FIXTURE_RECEIPTS.

 Migrations

 None — get_receipt_by_seal_id RPC already in
 002_rls_policies.sql.

 Query Layer

 Add to src/lib/db/queries/products.ts:
 - getProductById(id: string): Promise<Product |
 null> — used by ItemDetailPage

 Page / Component Changes

 StorefrontPage.tsx:
 - Remove all fixture imports
 - Add local state: merchant, products,
 collections, isLoading, notFound
 - useEffect on handle param: call
 getMerchantByHandle(handle) → then
 getProductsByMerchant + getCollectionsByMerchant
 - Dev fallback: if (!hasEnv) { set fixtures }
 - Render <StorefrontSkeleton /> while loading;
 not-found UI if notFound

 ItemDetailPage.tsx:
 - Remove fixture lookup
 - useEffect: call getMerchantByHandle(handle) +
 getProductById(item_id)
 - Dev fallback to fixtures when !hasEnv
 - Add loading skeleton + error state

 ReceiptPage.tsx:
 - If not already wired: replace fixture lookup
 with getReceiptBySealId(receipt_id) in a
 useEffect
 - Add secondary fetch:
 getMerchantById(receipt.merchant_id) for contact
 links
 - Add loading skeleton + "receipt not found"
 state

 Acceptance Criteria

 - /store/:handle fetches real merchant + products
  from DB when Supabase is configured
 - /store/:handle falls back to fixtures when
 !hasEnv, with no console errors
 - /receipt/:seal_id resolves via
 get_receipt_by_seal_id RPC
 - All three pages show loading skeletons during
 fetch
 - Bogus handle → not-found state (no crash)

 ---
 Phase 3C — Core Writes: Terminal + Archive

 Goal: Product CRUD fully persists to DB. Receipt
 creation decrements inventory atomically. All
 ledger status updates write to DB. Form error
 handling added.

 Frontend Quality Audit

 - src/lib/store/archive.store.ts:93 —
 merchant_id: 'merchant-001' hardcoded in
 mintProducts. Must use
 useMerchantStore.getState().merchant.id.
 - src/lib/store/archive.store.ts:87–169 —
 mintProducts, toggleProductStatus, updateProduct
 all never call any query function. List the exact
  lines that need DB write-through.
 - src/lib/store/ledger.store.ts:77–200 —
 markAsPaid, markManyAsPaid, markShipped,
 markPacked, markFulfilled, markReceived all never
  call updateReceiptStatus. List each.
 - src/lib/store/terminal.store.ts — Find
 persistReceipt(). Confirm it calls
 createReceipt() but does NOT call
 decrement_stock. This is the overselling bug.
 - src/pages/merchant/ArchivePage/ArchiveView.tsx
 — Find the setTimeout fake-loading block. Replace
  with real useArchiveStore isLoading state.
 - src/pages/merchant/LedgerPage.tsx — Same: find
 simulated loading, replace with
 useLedgerStore.isLoading.
 - src/pages/merchant/ArchivePage/ArchiveView.tsx
 — Check all form submit handlers (add product,
 edit product). Confirm none have try/catch or
 error toasts.

 Migrations

 None — decrement_stock RPC added in Phase 3A
 migration 006.

 Query Layer

 Add to src/lib/db/queries/products.ts:
 - deleteProduct(id: string): Promise<boolean> —
 soft delete: sets deleted_at
 - createCollection(...), updateCollection(id,
 patch), deleteCollection(id) — move
 getCollectionsByMerchant here too

 New file: src/lib/db/queries/collections.ts
 (extract collection queries from products.ts)

 Store Changes

 src/lib/store/archive.store.ts:
 - mintProducts(cards, productType) — after
 building product objects, call
 Promise.all(cards.map(card =>
 createProduct(product))). Replace temp IDs with
 returned DB IDs. On failure: toast + remove
 failed ghosts.
 - toggleProductStatus(productId) — optimistic
 local update first, then call
 updateProduct(productId, { status }). On error:
 revert + toast.
 - updateProduct(productId, updates) — same
 optimistic pattern + updateProduct query call.
 - New: deleteProduct(productId) — call
 deleteProduct query, filter from local state.

 src/lib/store/ledger.store.ts:
 - markAsPaid(receiptId, method) — after local
 update, call updateReceiptStatus(receiptId, {
 payment_status: 'paid', payment_method: method,
 log: updatedLog }).
 - markManyAsPaid(ids, method) — Promise.all() of
 updateReceiptStatus per id.
 - markShipped, markPacked, markFulfilled,
 markReceived — each calls updateReceiptStatus
 with the appropriate shipment_status + appended
 log entry.
 - All: on DB error, show toast (don't revert
 local state — eventual consistency is acceptable
 here).

 src/lib/store/terminal.store.ts:
 - persistReceipt() — after createReceipt()
 succeeds: call
 Promise.allSettled(visorItems.map(item =>
 db.rpc('decrement_stock', { p_product_id:
 item.productId, p_quantity: item.quantity }))).
 Log any decrement errors via console.warn but
 don't block the receipt ceremony.
 - After first receipt: if
 merchant.first_seal_issued === false, call
 updateMerchant(merchant.id, { first_seal_issued:
 true }) + update merchant store.

 Page / Component Changes

 - ArchivePage/ArchiveView.tsx — Replace
 setTimeout fake loading with const { isLoading,
 error } = useArchiveStore(). If error, show retry
  banner.
 - LedgerPage.tsx — Same pattern.
 - All merchant product/status form submits: wrap
 in try/catch, disable submit button while
 pending, show error toast on failure.

 Acceptance Criteria

 - Creating product via ghost cards inserts real
 rows in trovea.products
 - Status toggle writes to DB
 - Terminal receipt creation decrements
 stock_level on each line-item product atomically
 - markAsPaid, markShipped etc. all write to
 trovea.receipts
 - Archive + Ledger loading states are real (not
 simulated timeouts)
 - DB errors surface as toasts

 ---
 Phase 3D — Claims + Holds

 Goal: ClaimSheet and HoldSheet write to DB.
 Server-side hold/claim expiry (pg_cron already
 defined in 004) is confirmed working. Payment
 proof upload flow added.

 Frontend Quality Audit

 - src/components/public/ClaimSheet/ClaimSheet.tsx
  — Trace onClaimSubmitted callback. Confirm it
 never calls any DB query — just builds a WhatsApp
  link. Note: issuedClaimId is generated
 client-side (claim-${Date.now()}), not from DB.
 - src/components/public/HoldSheet/HoldSheet.tsx —
  Trace onHoldCreated callback. Confirm it adds to
  fixture-backed useHoldStore only. Note that
 expires_at is calculated client-side.
 - src/lib/store/hold.store.ts — Confirm no
 initFromDB. Confirm addHold, releaseHold,
 expireHold are local-only.
 - src/components/public/ClaimSheet/ClaimSheet.tsx
  — Note that there is no file upload UI for
 payment proof. This needs a new step or a
 follow-up PaymentProofModal flow.

 Migrations

 New file:
 supabase/migrations/007_claim_hold_rpcs.sql
 CREATE OR REPLACE FUNCTION
 trovea.get_active_hold_for_product(p_product_id
 UUID)
 RETURNS SETOF trovea.holds LANGUAGE sql SECURITY
 DEFINER SET search_path = trovea AS $$
   SELECT * FROM trovea.holds
   WHERE product_id = p_product_id AND status =
 'active' AND expires_at > NOW() LIMIT 1;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.get_active_hold_for_product(UUID) TO anon,
  authenticated;

 CREATE OR REPLACE FUNCTION
 trovea.get_pending_claim_for_product(p_product_id
  UUID)
 RETURNS SETOF trovea.claims LANGUAGE sql SECURITY
  DEFINER SET search_path = trovea AS $$
   SELECT * FROM trovea.claims
   WHERE product_id = p_product_id AND status =
 'pending' AND expires_at > NOW() LIMIT 1;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.get_pending_claim_for_product(UUID) TO
 anon, authenticated;

 Query Layer

 New file: src/lib/db/queries/claims.ts
 - createClaim(claim: Omit<ClaimRequest, 'id' |
 'created_at' | 'updated_at' | 'expires_at'>):
 Promise<ClaimRequest | null>
 - getPendingClaimForProduct(productId: string):
 Promise<ClaimRequest | null> — calls RPC
 - getClaimsByMerchant(merchantId: string):
 Promise<ClaimRequest[]>
 - updateClaimStatus(id: string, status:
 ClaimRequest['status']): Promise<boolean>
 - uploadClaimProof(claimId: string, file: File,
 merchantId: string): Promise<string | null> —
 uploads to
 claim-proofs/{merchantId}/{claimId}/proof.{ext},
 updates proof_url

 New file: src/lib/db/queries/holds.ts
 - createHold(hold: Omit<HoldRequest, 'id' |
 'created_at' | 'expires_at'>):
 Promise<HoldRequest | null>
 - getActiveHoldForProduct(productId: string):
 Promise<HoldRequest | null> — calls RPC
 - getHoldsByMerchant(merchantId: string):
 Promise<HoldRequest[]>
 - releaseHold(id: string): Promise<boolean>

 Store Changes

 src/lib/store/hold.store.ts:
 - Add initFromDB(merchantId: string):
 Promise<void> — calls getHoldsByMerchant, sets
 state
 - addHold(hold) → async: calls createHold()
 query, adds returned (DB-assigned) hold to state,
  returns it for WhatsApp link construction
 - releaseHold(holdId) → calls releaseHold(holdId)
  query, updates local state
 - Wire: call hold.store.initFromDB(merchant.id)
 from App.tsx loadMerchantData() (alongside
 archive + ledger)

 Component Changes

 HoldSheet.tsx:
 - Confirm button: call createHold({ product_id,
 merchant_id, buyer_name, buyer_phone,
 duration_hours: merchant.hold_duration_hours,
 status: 'active' }) directly
 - Loading spinner on confirm button while
 submitting
 - On success: use DB-returned expires_at for
 WhatsApp link and confirmation text
 - On error: inline error message, keep form open
 (no WhatsApp)

 ClaimSheet.tsx:
 - Submit step: call createClaim({ product_id,
 merchant_id, buyer_name, buyer_phone,
 buyer_email, status: 'pending' })
 - On success: set issuedClaimId from returned DB
 row
 - Optional proof upload step: file input →
 uploadClaimProof(claim.id, file, merchant.id)

 StorefrontPage.tsx:
 - On mount: batch-fetch active holds/claims for
 visible products using RPCs. Cache in
 Record<string, boolean> local state. Use to
 disable CTA buttons or show "On Hold" / "Claimed"
  badges.

 Acceptance Criteria

 - Hold submission creates a row in trovea.holds
 with DB-assigned expires_at
 - Claim submission creates a row in trovea.claims
 - pg_cron expire-holds and expire-claims jobs
 clean up expired rows every 15 minutes (no
 client-side expiry logic needed)
 - Product that has an active hold shows as
 unavailable on the storefront
 - Proof upload writes to claim-proofs storage
 bucket and updates claims.proof_url

 ---
 Phase 3E — Bookings + Drops

 Goal: BookingRequestSheet writes to DB.
 SchedulePage window CRUD is wired.
 DropCardGenerator persists drops. Slot
 availability is real.

 Frontend Quality Audit

 -
 src/pages/merchant/SchedulePage/ScheduleView.tsx
 — Confirm top-level FIXTURE_WINDOWS and
 FIXTURE_BOOKINGS imports. List every fixture
 reference to be replaced with fetched state.
 -
 src/pages/merchant/BookingsPage/BookingsView.tsx
 — Same for FIXTURE_BOOKINGS and
 FIXTURE_ENQUIRIES. Confirm whether confirm/cancel
  buttons call any action or are display-only.
 - src/components/public/BookingRequestSheet/Booki
 ngRequestSheet.tsx — Confirm "Request Booking"
 only calls window.open(waLink) and no DB write.
 - src/lib/utils/host.ts — Confirm
 isSlotAvailable, getAvailableDays use
 FIXTURE_BOOKINGS only. These must be wired to
 real DB data in this phase.
 - src/lib/db/queries/bookings.ts — Confirm
 createWindow exists; confirm updateWindow,
 deleteWindow, createBooking, updateBooking are
 missing.
 - src/lib/db/queries/drops.ts — Confirm
 createDrop and deleteDrop are missing.

 Migrations

 New file:
 supabase/migrations/008_booking_drop_helpers.sql
 CREATE OR REPLACE FUNCTION trovea.get_open_window
 s_for_merchant(p_merchant_id UUID)
 RETURNS SETOF trovea.availability_windows
 LANGUAGE sql SECURITY DEFINER SET search_path =
 trovea AS $$
   SELECT * FROM trovea.availability_windows
   WHERE merchant_id = p_merchant_id AND status IN
  ('upcoming', 'open') AND closes_at > NOW()
   ORDER BY opens_at ASC;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.get_open_windows_for_merchant(UUID) TO
 anon, authenticated;

 -- pg_cron: auto-update window and drop statuses
 every 5 minutes
 SELECT cron.schedule('update-window-status', '*/5
  * * * *', $$
   UPDATE trovea.availability_windows
   SET status = CASE
     WHEN opens_at <= NOW() AND closes_at > NOW()
 THEN 'open'
     WHEN closes_at <= NOW() THEN 'closed'
     ELSE status END, updated_at = NOW()
   WHERE status IN ('upcoming', 'open');
 $$);

 SELECT cron.schedule('update-drop-status', '*/5 *
  * * *', $$
   UPDATE trovea.drops
   SET status = 'live', updated_at = NOW()
   WHERE status = 'scheduled' AND scheduled_at <=
 NOW();
 $$);

 Query Layer

 Add to src/lib/db/queries/bookings.ts:
 - createBooking(booking: Omit<Booking, 'id' |
 'created_at'>): Promise<Booking | null>
 - updateBooking(id: string, patch: Pick<Booking,
 'status'> | Pick<Booking, 'notes'>):
 Promise<boolean>
 - updateWindow(id: string, patch:
 Partial<AvailabilityWindow>): Promise<boolean>
 - deleteWindow(id: string): Promise<boolean>
 - getOpenWindowsForMerchant(merchantId: string):
 Promise<AvailabilityWindow[]> — calls RPC

 Add to src/lib/db/queries/drops.ts:
 - createDrop(drop: Omit<Drop, 'id' | 'created_at'
  | 'updated_at'>): Promise<Drop | null>
 - deleteDrop(id: string): Promise<boolean>

 Page / Component Changes

 SchedulePage/ScheduleView.tsx: Replace fixture
 imports with useEffect calling
 getWindowsByMerchant + getBookingsByMerchant.
 Wire create/edit/delete window actions to
 queries. Local state per-session (no dedicated
 store needed).

 BookingsPage/BookingsView.tsx: Replace fixtures
 with getBookingsByMerchant +
 getEnquiriesByMerchant. Wire confirm/cancel to
 updateBooking. Wire enquiry status change to
 updateEnquiry.

 BookingRequestSheet.tsx: On confirm: call
 createBooking({ merchant_id, service_id,
 service_name, buyer_name, buyer_phone,
 scheduled_at, duration_minutes, status: 'pending'
  }). Loading spinner during submit. On success:
 proceed to confirmation UI, offer WhatsApp as
 secondary action. On error: inline error, keep
 form open.

 Drop creation (Collector): Locate drop creation
 UI (DropCardGenerator or Archive drawer). Wire to
  createDrop() on submit.

 src/lib/utils/host.ts: isSlotAvailable and
 getAvailableDays — update to accept a real
 bookings: Booking[] array parameter instead of
 importing fixtures directly. Callers pass fetched
  bookings from DB.

 Acceptance Criteria

 - Completing BookingRequestSheet creates a row in
  trovea.bookings with status = 'pending'
 - Merchant can confirm/cancel bookings and it
 persists
 - Merchant can create/delete availability windows
  and it persists
 - Window and drop statuses auto-update via
 pg_cron
 - Slot availability in the booking sheet is
 computed from real DB bookings

 ---
 Phase 3F — Settings + Merchant Profile

 Goal: SettingsPage writes updateMerchant to DB.
 Enquiry form (Studio) writes to trovea.enquiries.
  Store pause and store_config changes persist.

 Frontend Quality Audit

 - src/pages/merchant/SettingsPage.tsx — Trace
 handleSave(). Confirm it calls
 updateMerchant(updates) on the Zustand store only
  (local state). Confirm DB query is never called.
 - src/pages/merchant/SettingsPage.tsx — List
 fields collected but NOT included in the save
 patch: is_paused, pause_message,
 pause_return_date, full store_config.
 - src/pages/merchant/SettingsPage.tsx — Confirm
 no inline form validation (phone format, account
 number length). Note all fields that need
 validation.
 - StorefrontPage Studio enquiry form — locate the
  submit handler. Confirm it only opens a WhatsApp
  link with no DB write.

 Migrations

 None.

 Query Layer

 Add to src/lib/db/queries/profiles.ts (from Phase
  3A):
 - updateProfile(id: string, patch:
 Partial<Profile>): Promise<boolean>

 src/lib/db/queries/merchants.ts already has
 updateMerchant(id, patch) — no changes needed.

 Store Changes

 src/lib/store/merchant.store.ts:
 - Add async saveMerchant(): Promise<boolean> —
 calls updateMerchant(merchant.id, merchant) with
 current store state. Returns true on success.
 - SettingsPage calls updateMerchant(patch) (local
  update) then saveMerchant() (DB write). On DB
 error: revert to pre-save snapshot + toast.

 src/lib/store/onboarding.store.ts:
 - Already addressed in 3A: raw
 .from('profiles').upsert() replaced with
 upsertProfile().

 Page / Component Changes

 src/pages/merchant/SettingsPage.tsx:
 - handleSave() — add isSaving state. Call
 updateMerchant(localPatch) (optimistic local),
 then saveMerchant(). On failure: revert + toast.
 - Ensure patch includes: is_paused,
 pause_message, pause_return_date, full
 store_config object.
 - Add inline validation before save: whatsapp
 (Nigerian format), account_number (10 digits if
 checkout enabled), displayName (non-empty, ≤50
 chars).

 Studio enquiry form (StorefrontPage or
 EnquirySheet):
 - On submit: call createEnquiry({ merchant_id,
 ...formData }) before building WhatsApp link.
 - Loading spinner on submit button. Error toast
 on failure.

 Acceptance Criteria

 - Saving SettingsPage writes to trovea.merchants
 — reload confirms persisted data
 - is_paused toggle persists; paused stores show
 pause message to buyers
 - store_config changes (from Architect) persist
 when saved
 - Studio enquiry creates a row in
 trovea.enquiries
 - Invalid phone/account number blocked by inline
 validation

 ---
 Phase 3G — Admin + Analytics

 Goal: Admin panel reads/writes real data with
 DB-enforced RLS. Admin role synced to JWT via
 Custom Access Token Hook. InsightsPage uses real
 receipt data. Real-time subscription for new
 receipts.

 Frontend Quality Audit

 - src/components/auth/RequireAdmin.tsx — Confirm
 it reads user.app_metadata?.role. This requires a
  Supabase Custom Access Token Hook to be
 registered in the Dashboard. Document the gap.
 - src/lib/store/admin.store.ts — List all
 mutations (suspendMerchant, setMerchantTier,
 setReportStatus). Confirm each is local-only.
 Note admin_id: 'admin-001' hardcode.
 - src/pages/admin/AdminStoresPage.tsx,
 AdminReportsPage.tsx — Confirm all data from
 DEV_MERCHANTS / FIXTURE_REPORTS. List
 page-by-page.
 - src/pages/merchant/InsightsPage.tsx — List
 every fixture import. Note that receipt-derived
 metrics (revenue, sales count) will be real once
 3C is done; drops/windows/bookings/enquiries will
  still be fixtures until this phase.

 Migrations

 New file:
 supabase/migrations/009_admin_functions.sql
 -- Custom Access Token Hook: syncs
 trovea.profiles.role into JWT app_metadata
 -- Must also be registered in Supabase Dashboard
 > Auth > Hooks
 CREATE OR REPLACE FUNCTION
 trovea.custom_access_token_hook(event JSONB)
 RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY
 DEFINER SET search_path = trovea AS $$
 DECLARE claims JSONB; user_role TEXT; BEGIN
   SELECT role INTO user_role FROM trovea.profiles
  WHERE id = (event->>'user_id')::UUID;
   claims := event->'claims';
   claims := jsonb_set(claims, '{app_metadata}',
     COALESCE(claims->'app_metadata', '{}'::JSONB)
  || jsonb_build_object('role', user_role));
   RETURN jsonb_set(event, '{claims}', claims);
 END;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.custom_access_token_hook(JSONB) TO
 supabase_auth_admin;
 REVOKE EXECUTE ON FUNCTION
 trovea.custom_access_token_hook(JSONB) FROM
 authenticated, anon, public;

 -- Admin RPCs (all check trovea.is_admin()
 internally)
 CREATE OR REPLACE FUNCTION
 trovea.admin_get_all_merchants(p_suspended_only
 BOOLEAN DEFAULT false)
 RETURNS SETOF trovea.merchants LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = trovea AS $$
 BEGIN
   IF NOT trovea.is_admin() THEN RAISE EXCEPTION
 'Unauthorized'; END IF;
   RETURN QUERY SELECT * FROM trovea.merchants
     WHERE (p_suspended_only = false OR
 is_suspended = true) AND deleted_at IS NULL
     ORDER BY created_at DESC;
 END;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.admin_get_all_merchants(BOOLEAN) TO
 authenticated;

 CREATE OR REPLACE FUNCTION
 trovea.admin_log_action(p_action TEXT,
 p_target_merchant_id UUID DEFAULT NULL, p_note
 TEXT DEFAULT NULL)
 RETURNS trovea.admin_log LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = trovea AS $$
 DECLARE v_entry trovea.admin_log; BEGIN
   IF NOT trovea.is_admin() THEN RAISE EXCEPTION
 'Unauthorized'; END IF;
   INSERT INTO trovea.admin_log (admin_id, action,
  target_merchant_id, note)
   VALUES (auth.uid(), p_action,
 p_target_merchant_id, p_note) RETURNING * INTO
 v_entry;
   RETURN v_entry;
 END;
 $$;
 GRANT EXECUTE ON FUNCTION
 trovea.admin_log_action(TEXT, UUID, TEXT) TO
 authenticated;

 Query Layer

 New file: src/lib/db/queries/admin.ts
 - adminGetAllMerchants(suspendedOnly?: boolean):
 Promise<Merchant[]> — calls
 admin_get_all_merchants RPC
 - adminSuspendMerchant(merchantId: string, note:
 string): Promise<boolean> — updateMerchant(id, {
 is_suspended: true }) +
 adminLogAction('suspended', id, note)
 - adminUnsuspendMerchant(merchantId: string):
 Promise<boolean>
 - adminSetVerificationTier(merchantId: string,
 tier: Merchant['verification_tier']):
 Promise<boolean>
 - adminGetReports(): Promise<StoreReport[]>
 - adminUpdateReportStatus(id: string, status:
 string): Promise<boolean>
 - adminLogAction(action: string,
 targetMerchantId?: string, note?: string):
 Promise<AdminLogEntry | null>
 - adminGetLog(limit?: number):
 Promise<AdminLogEntry[]>

 Store Changes

 src/lib/store/admin.store.ts:
 - Add isLoading, error state
 - Add initFromDB(): Promise<void> — calls
 adminGetAllMerchants() + adminGetReports()
 - suspendMerchant, unsuspendMerchant,
 setMerchantTier, setReportStatus — each made
 async, calls corresponding admin* query, then
 updates local state. Replace admin_id:
 'admin-001' with
 useAuthStore.getState().user?.id.

 Page / Component Changes

 src/components/auth/RequireAdmin.tsx:
 - Add interim role check: after isAuthenticated,
 call getProfile(user.id), check profile.role ===
 'admin'. If not, redirect to /dashboard. Show
 loading spinner while profile fetches.
 - Add comment: // Phase 3G: once
 custom_access_token_hook is registered in
 Dashboard, switch to app_metadata check

 Admin pages: Wire each to
 admin.store.initFromDB(). Wire all mutation
 buttons to the async store actions. Show loading
 skeletons on data fetch.

 src/pages/merchant/InsightsPage.tsx:
 - Receipt metrics: already real via
 useLedgerStore().receipts (real after Phase 3C)
 - Drops: replace fixture import with useEffect
 calling getDropsByMerchant(merchant.id)
 - Windows: getWindowsByMerchant(merchant.id)
 - Bookings: getBookingsByMerchant(merchant.id)
 - Enquiries: getEnquiriesByMerchant(merchant.id)

 Real-time subscription (App.tsx or
 ledger.store.ts:initFromDB):
 const channel = supabase
   .channel('merchant-receipts')
   .on('postgres_changes', {
     event: 'INSERT', schema: 'trovea', table:
 'receipts',
     filter: `merchant_id=eq.${merchant.id}`
   }, (payload) => {
     useLedgerStore.getState().setReceipts(
       [payload.new as Receipt,
 ...useLedgerStore.getState().receipts]
     );
     useUIStore.getState().addToast('New order
 received', 'success');
   })
   .subscribe();
 // Store channel ref; call channel.unsubscribe()
 in signOut

 Acceptance Criteria

 - Admin role verified against
 trovea.profiles.role before granting admin UI
 access
 - suspendMerchant / setMerchantTier create
 admin_log entries in DB
 - All admin mutations blocked at DB level for
 non-admin users
 - InsightsPage shows real receipt-derived metrics
  (revenue, order count)
 - New receipt in Terminal appears in LedgerPage
 in real time

 ---
 Summary: Phase → File Map

 Phase: 3A
 New Migrations: 006_missing_columns_and_rpcs.sql
 New Query Files: profiles.ts
 Key Store Changes: auth.store (listener fix),
   onboarding.store
 Key Pages: App.tsx
 ────────────────────────────────────────
 Phase: 3B
 New Migrations: —
 New Query Files: products.ts (+getProductById)
 Key Store Changes: —
 Key Pages: StorefrontPage, ItemDetailPage,
   ReceiptPage
 ────────────────────────────────────────
 Phase: 3C
 New Migrations: —
 New Query Files: collections.ts
 Key Store Changes: archive.store, ledger.store,
   terminal.store
 Key Pages: ArchivePage, LedgerPage
 ────────────────────────────────────────
 Phase: 3D
 New Migrations: 007_claim_hold_rpcs.sql
 New Query Files: claims.ts, holds.ts
 Key Store Changes: hold.store
 Key Pages: ClaimSheet, HoldSheet, StorefrontPage
 ────────────────────────────────────────
 Phase: 3E
 New Migrations: 008_booking_drop_helpers.sql
 New Query Files: additions to bookings.ts,
   drops.ts
 Key Store Changes: —
 Key Pages: SchedulePage, BookingsPage,
   BookingRequestSheet
 ────────────────────────────────────────
 Phase: 3F
 New Migrations: —
 New Query Files: additions to profiles.ts
 Key Store Changes: merchant.store
 (+saveMerchant),
   onboarding.store
 Key Pages: SettingsPage
 ────────────────────────────────────────
 Phase: 3G
 New Migrations: 009_admin_functions.sql
 New Query Files: admin.ts
 Key Store Changes: admin.store
 Key Pages: All admin pages, InsightsPage, App.tsx

---
---
REVISED BACKEND PLAN — NestJS API Layer (Phase 3A → 3G)
---
---

## Architecture Update

The previous plan assumed frontend → Supabase direct calls via `src/lib/db/queries/`.
With NestJS introduced, the stack becomes:

  Frontend (React) → NestJS API → Supabase (PostgreSQL)

  Supabase is still used for:
    - OTP phone auth (SMS) + JWT issuance — frontend calls supabase.auth directly
    - Realtime subscriptions — frontend subscribes directly (no NestJS proxy needed)
    - Storage — frontend uploads directly to Supabase Storage buckets
    - Migrations — Supabase CLI manages schema via supabase/migrations/

  NestJS handles:
    - All data reads and writes (replaces src/lib/db/queries/)
    - Business logic (stock validation, expiry, authorization checks)
    - JWT verification (validates Supabase-issued JWTs on every protected route)
    - Uses service-role Supabase client internally (bypasses RLS; NestJS enforces authz)

## Project Structure

```
trovea/                          ← React frontend (existing, unchanged path)
  src/
    lib/
      api/                       ← NEW: replaces src/lib/db/queries/
        client.ts                ← axios instance with Bearer token interceptor
        merchants.api.ts
        products.api.ts
        receipts.api.ts
        claims.api.ts
        holds.api.ts
        bookings.api.ts
        drops.api.ts
        enquiries.api.ts
        admin.api.ts
      db/queries/                ← DEPRECATED after Phase 3B (keep for auth only)
      store/                     ← Zustand stores call api/ instead of db/queries/
    ...

api/                             ← NEW: NestJS backend
  src/
    main.ts                      ← listens on port 3001
    app.module.ts
    auth/
      auth.module.ts
      auth.guard.ts              ← validates Supabase JWT via JWKS/secret
      current-user.decorator.ts  ← extracts user id from JWT payload
    common/
      supabase/
        supabase.module.ts       ← global module
        supabase.service.ts      ← wraps createClient(url, SERVICE_ROLE_KEY)
    merchants/
      merchants.module.ts
      merchants.controller.ts
      merchants.service.ts
      dto/
    products/
      products.module.ts
      products.controller.ts
      products.service.ts
      dto/
    receipts/
      receipts.module.ts
      receipts.controller.ts
      receipts.service.ts
      dto/
    claims/
    holds/
    bookings/
    drops/
    enquiries/
    admin/
  nest-cli.json
  tsconfig.json
  package.json
  .env                           ← SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET

supabase/                        ← migrations (unchanged, managed by Supabase CLI)
  migrations/
```

## Auth Flow

  1. Frontend: supabase.auth.signInWithOtp({ phone }) — unchanged
  2. Frontend: supabase.auth.verifyOtp() → receives JWT
  3. Frontend: attaches JWT to every API call:
       Authorization: Bearer <supabase-jwt>
  4. NestJS AuthGuard: verifies JWT signature using SUPABASE_JWT_SECRET
     Extracts sub (user UUID) → available as @CurrentUser() in controllers
  5. NestJS SupabaseService: uses service-role client for all DB operations
     Authorization enforced in service layer (check merchant.owner_id === userId, etc.)

## Frontend API Client

  File: src/lib/api/client.ts

  import axios from 'axios';
  import { supabase } from '@/lib/supabase';

  export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  });

  apiClient.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  });

  Dev fallback: if VITE_API_URL is unset, Zustand stores skip API calls
  and remain fixture-backed (same hasEnv pattern as before).

---

## Phase 3A — Pre-flight + NestJS Bootstrap

Goal: Fix structural integrity gaps in the frontend. Bootstrap the NestJS
project with auth guard, SupabaseService, and health check endpoint.

### Frontend Quality Audit

  Same as original Phase 3A:
  - Fix auth.store.ts:80 onAuthStateChange listener leak
  - Remove initFromDB calls from !hasEnv branch in App.tsx:96-98
  - Replace console.error merchant load failure with toast (App.tsx:112)
  - Add is_suspended: boolean to Merchant TypeScript type (merchant.types.ts)
  - Add TODO comment for RequireAdmin on admin routes (App.tsx:242)

### Migrations

  New file: supabase/migrations/006_missing_columns_and_rpcs.sql
    - ADD COLUMN has_gone_live BOOLEAN to merchants
    - ADD COLUMN first_seal_issued BOOLEAN to merchants
    - CREATE FUNCTION trovea.decrement_stock(p_product_id UUID, p_quantity INT)
      (atomic stock decrement used by receipts.service.ts in Phase 3C)

### NestJS Bootstrap

  api/ directory scaffold:
    npm init / nest new api

  api/src/common/supabase/supabase.service.ts
    - createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    - exported as @Injectable() SupabaseService
    - used by all domain services

  api/src/auth/auth.guard.ts
    - Validates Authorization: Bearer <jwt> header
    - Uses jsonwebtoken.verify(token, SUPABASE_JWT_SECRET)
    - Attaches { userId: sub } to request
    - Allows public routes via @Public() decorator

  api/src/main.ts
    - Global prefix: /api
    - CORS: allow VITE_WEB_URL (localhost:5173 in dev)
    - Port: 3001

  Endpoints added this phase:
    GET /api/health → { status: 'ok' }

### Frontend Changes

  - Create src/lib/api/client.ts (axios + auth interceptor as above)
  - No store changes yet — stores still use fixtures in this phase

### Acceptance Criteria

  - Migration 006 runs cleanly
  - Merchant TS type has is_suspended: boolean
  - Auth listener leak fixed
  - GET /api/health returns 200 with Supabase env configured
  - NestJS rejects requests missing a valid JWT with 401

---

## Phase 3B — Core Reads: Storefront

Goal: StorefrontPage, ItemDetailPage, ReceiptPage fetch real data via NestJS.
Frontend src/lib/db/queries/ is no longer used for these public reads.

### Frontend Quality Audit

  - StorefrontPage: locate all FIXTURE_* imports and merchant-001 hardcodes
  - StorefrontPage: add <StorefrontSkeleton /> for loading state
  - ItemDetailPage: confirm it uses useParams for item_id and handle
  - ReceiptPage: confirm whether getReceiptBySealId is called or still fixture-based

### NestJS Module — merchants

  api/src/merchants/merchants.controller.ts
    GET /api/stores/:handle           → @Public() → merchants.service.getByHandle(handle)
    GET /api/stores/:handle/products  → @Public() → products.service.getByMerchant(merchantId)
    GET /api/stores/:handle/collections → @Public() → products.service.getCollections(merchantId)

  api/src/merchants/merchants.service.ts
    getByHandle(handle: string): Promise<Merchant | null>
      supabase.from('merchants').select('*').eq('handle', handle).single()

  api/src/products/products.service.ts
    getByMerchant(merchantId: string): Promise<Product[]>
    getById(id: string): Promise<Product | null>
    getCollections(merchantId: string): Promise<Collection[]>

### NestJS Module — receipts (public lookup)

  api/src/receipts/receipts.controller.ts
    GET /api/receipts/:sealId → @Public() → receipts.service.getBySealId(sealId)

  api/src/receipts/receipts.service.ts
    getBySealId(sealId: string): Promise<Receipt | null>
      supabase.rpc('get_receipt_by_seal_id', { p_seal_id: sealId }).single()

### Frontend API Client

  src/lib/api/merchants.api.ts
    getMerchantByHandle(handle): fetch GET /api/stores/:handle
    getProductsByHandle(handle): fetch GET /api/stores/:handle/products
    getCollectionsByHandle(handle): fetch GET /api/stores/:handle/collections

  src/lib/api/receipts.api.ts
    getReceiptBySealId(sealId): fetch GET /api/receipts/:sealId

### Frontend Page Changes

  StorefrontPage.tsx
    - Remove all fixture imports
    - useEffect: call getMerchantByHandle(handle) → then getProductsByHandle
    - Dev fallback: if (!VITE_API_URL) → set fixtures
    - Render <StorefrontSkeleton /> while loading; not-found if null

  ItemDetailPage.tsx + ReceiptPage.tsx
    - Same pattern: remove fixtures, add API call, add skeleton + error state

### Acceptance Criteria

  - GET /api/stores/tolasarchive returns merchant JSON
  - StorefrontPage renders real data from NestJS
  - !VITE_API_URL falls back to fixtures without errors
  - ReceiptPage resolves via /api/receipts/:sealId
  - Loading skeletons visible during fetch

---

## Phase 3C — Core Writes: Terminal + Archive

Goal: Product CRUD and receipt issuance go through NestJS.
Inventory is decremented atomically. Ledger status updates persist.

### Frontend Quality Audit

  - archive.store.ts:93 — merchant_id: 'merchant-001' hardcoded in mintProducts
  - archive.store.ts:87-169 — mintProducts, toggleProductStatus, updateProduct never call API
  - ledger.store.ts:77-200 — all mark* methods are store-only, never call API
  - terminal.store.ts — persistReceipt calls createReceipt but does NOT decrement stock
  - ArchivePage: find setTimeout fake-loading; replace with real isLoading from store
  - LedgerPage: same — replace simulated loading

### NestJS Module — products (writes)

  api/src/products/products.controller.ts
    POST   /api/products          → @UseGuards(AuthGuard) → createProduct(dto, userId)
    PATCH  /api/products/:id      → @UseGuards(AuthGuard) → updateProduct(id, dto, userId)
    DELETE /api/products/:id      → @UseGuards(AuthGuard) → deleteProduct(id, userId)

  api/src/products/products.service.ts
    createProduct(dto, userId): validates merchant.owner_id === userId, inserts row
    updateProduct(id, dto, userId): validates ownership, updates row
    deleteProduct(id, userId): validates ownership, sets deleted_at = NOW()

  api/src/products/dto/
    create-product.dto.ts    ← class-validator decorators
    update-product.dto.ts

### NestJS Module — receipts (writes)

  api/src/receipts/receipts.controller.ts
    POST  /api/receipts           → @UseGuards(AuthGuard) → createReceipt(dto, userId)
    PATCH /api/receipts/:id/status → @UseGuards(AuthGuard) → updateStatus(id, dto, userId)

  api/src/receipts/receipts.service.ts
    createReceipt(dto, userId):
      1. validate merchant.owner_id === userId
      2. insert into trovea.receipts
      3. for each line item with productId:
           supabase.rpc('decrement_stock', { p_product_id, p_quantity })
      4. if merchant.first_seal_issued === false: update merchants set first_seal_issued = true
      5. return created receipt

    updateStatus(id, dto, userId):
      validates ownership, updates payment_status or shipment_status + appends log entry

  api/src/receipts/dto/
    create-receipt.dto.ts
    update-receipt-status.dto.ts

### Frontend API Client

  src/lib/api/products.api.ts
    createProduct(dto): POST /api/products
    updateProduct(id, dto): PATCH /api/products/:id
    deleteProduct(id): DELETE /api/products/:id

  src/lib/api/receipts.api.ts  (add to existing)
    createReceipt(dto): POST /api/receipts
    updateReceiptStatus(id, dto): PATCH /api/receipts/:id/status

### Frontend Store Changes

  archive.store.ts
    mintProducts: call createProduct() API per card; replace temp ID with returned id
    toggleProductStatus: call updateProduct() API; revert on error + toast
    updateProduct: call updateProduct() API; optimistic update pattern
    deleteProduct (new): call deleteProduct() API; filter from local state

  ledger.store.ts
    markAsPaid: call updateReceiptStatus() API after local update
    markManyAsPaid: Promise.all of updateReceiptStatus per id
    markShipped, markPacked, markFulfilled, markReceived: each calls updateReceiptStatus

  terminal.store.ts
    persistReceipt: call createReceipt() API (NestJS handles stock decrement internally)

### Acceptance Criteria

  - POST /api/products inserts real DB row (no more merchant-001 hardcode)
  - PATCH /api/receipts/:id/status updates DB
  - Terminal receipt creation decrements stock_level via decrement_stock RPC
  - Archive + Ledger show real loading states (not setTimeout)
  - DB errors surface as toasts; unauthorized requests return 403

---

## Phase 3D — Claims + Holds

Goal: ClaimSheet and HoldSheet write to DB via NestJS.
Server-side expiry handled by existing pg_cron jobs.

### Frontend Quality Audit

  - ClaimSheet: trace onClaimSubmitted — confirm no API call, only WhatsApp link
  - ClaimSheet: note issuedClaimId is client-generated (claim-${Date.now()}) — must come from DB
  - HoldSheet: trace onHoldCreated — confirm it only adds to fixture hold.store
  - HoldSheet: note expires_at is calculated client-side — must come from DB trigger
  - hold.store.ts: confirm no initFromDB, all actions local-only

### Migrations

  New file: supabase/migrations/007_claim_hold_rpcs.sql
    - CREATE FUNCTION trovea.get_active_hold_for_product(p_product_id UUID)
    - CREATE FUNCTION trovea.get_pending_claim_for_product(p_product_id UUID)
    - GRANT EXECUTE ... TO anon, authenticated

### NestJS Module — holds

  api/src/holds/holds.controller.ts
    POST /api/holds                    → @Public() → holds.service.create(dto)
    GET  /api/holds/product/:productId → @Public() → holds.service.getActiveForProduct(id)
    PATCH /api/holds/:id/release       → @UseGuards(AuthGuard) → holds.service.release(id, userId)
    GET  /api/holds                    → @UseGuards(AuthGuard) → holds.service.getByMerchant(userId)

  api/src/holds/holds.service.ts
    create(dto): insert into trovea.holds; DB trigger sets expires_at; return row
    getActiveForProduct(productId): calls get_active_hold_for_product RPC
    release(id, userId): validates merchant ownership; update status = 'released'
    getByMerchant(userId): get merchant by owner_id; select holds where merchant_id = merchant.id

### NestJS Module — claims

  api/src/claims/claims.controller.ts
    POST /api/claims                    → @Public() → claims.service.create(dto)
    GET  /api/claims/product/:productId → @Public() → claims.service.getPendingForProduct(id)
    PATCH /api/claims/:id/status        → @UseGuards(AuthGuard) → claims.service.updateStatus(...)
    GET  /api/claims                    → @UseGuards(AuthGuard) → claims.service.getByMerchant(userId)
    POST /api/claims/:id/proof          → @Public() → claims.service.uploadProof(id, file)

  api/src/claims/claims.service.ts
    create(dto): insert into trovea.claims; DB trigger sets expires_at; return row
    getPendingForProduct(productId): calls get_pending_claim_for_product RPC
    updateStatus(id, status, userId): validates merchant ownership; updates status
    uploadProof(id, file):
      upload to Supabase Storage bucket claim-proofs/{merchantId}/{claimId}/proof.{ext}
      update claims.proof_url with public URL

### Frontend API Client

  src/lib/api/holds.api.ts
    createHold(dto): POST /api/holds
    getActiveHold(productId): GET /api/holds/product/:productId
    getHoldsByMerchant(): GET /api/holds
    releaseHold(id): PATCH /api/holds/:id/release

  src/lib/api/claims.api.ts
    createClaim(dto): POST /api/claims
    getPendingClaim(productId): GET /api/claims/product/:productId
    updateClaimStatus(id, status): PATCH /api/claims/:id/status
    uploadClaimProof(id, file): POST /api/claims/:id/proof (multipart)

### Frontend Store + Component Changes

  hold.store.ts
    addHold: call createHold() API; add returned (DB-assigned) hold to state; return for WA link
    releaseHold: call releaseHold() API; update state
    initFromDB(merchantId): call getHoldsByMerchant() API; set holds state

  HoldSheet.tsx
    On confirm: call createHold() API; use returned expires_at in confirmation text
    Loading spinner during submit; inline error on failure (no WhatsApp on error)

  ClaimSheet.tsx
    On submit: call createClaim() API; set issuedClaimId from returned row
    Proof upload step: call uploadClaimProof() API with selected file

  StorefrontPage.tsx
    On mount: batch call getPendingClaim + getActiveHold per visible product
    Cache results in Record<productId, boolean> local state
    Disable CTAs / show "On Hold" or "Claimed" badges accordingly

### Acceptance Criteria

  - POST /api/holds creates trovea.holds row with DB-assigned expires_at
  - POST /api/claims creates trovea.claims row
  - pg_cron expire-holds and expire-claims clean up rows every 15 min
  - Storefront shows hold/claim state on product cards
  - Proof upload writes to claim-proofs bucket + updates claims.proof_url

---

## Phase 3E — Bookings + Drops

Goal: BookingRequestSheet persists via NestJS. SchedulePage window CRUD wired.
DropCardGenerator persists drops. Slot availability uses real DB data.

### Frontend Quality Audit

  - SchedulePage: confirm FIXTURE_WINDOWS + FIXTURE_BOOKINGS imports; list every reference
  - BookingsPage: confirm FIXTURE_BOOKINGS + FIXTURE_ENQUIRIES; confirm confirm/cancel are display-only
  - BookingRequestSheet: confirm "Request Booking" only calls window.open(waLink)
  - host.ts utils: confirm isSlotAvailable + getAvailableDays use FIXTURE_BOOKINGS
  - bookings.ts queries: confirm createWindow exists; createBooking, updateBooking missing
  - drops.ts queries: confirm createDrop, deleteDrop missing

### Migrations

  New file: supabase/migrations/008_booking_drop_helpers.sql
    - CREATE FUNCTION trovea.get_open_windows_for_merchant(p_merchant_id UUID)
    - pg_cron: update-window-status every 5 minutes (upcoming → open → closed)
    - pg_cron: update-drop-status every 5 minutes (scheduled → live)

### NestJS Module — bookings

  api/src/bookings/bookings.controller.ts
    GET  /api/bookings                          → @UseGuards → getByMerchant(userId)
    POST /api/bookings                          → @Public() → create(dto)
    PATCH /api/bookings/:id                     → @UseGuards → update(id, dto, userId)
    GET  /api/windows                           → @UseGuards → getWindowsByMerchant(userId)
    POST /api/windows                           → @UseGuards → createWindow(dto, userId)
    PATCH /api/windows/:id                      → @UseGuards → updateWindow(id, dto, userId)
    DELETE /api/windows/:id                     → @UseGuards → deleteWindow(id, userId)
    GET  /api/windows/merchant/:merchantId/open → @Public() → getOpenWindows(merchantId)

  api/src/bookings/bookings.service.ts
    create(dto): insert into trovea.bookings with status = 'pending'; return row
    update(id, dto, userId): validates merchant ownership; update status/notes
    createWindow(dto, userId): validates ownership; insert availability_window
    deleteWindow(id, userId): validates ownership + status = 'upcoming'; delete
    getOpenWindows(merchantId): calls get_open_windows_for_merchant RPC

### NestJS Module — drops

  api/src/drops/drops.controller.ts
    GET    /api/drops       → @UseGuards → getByMerchant(userId)
    POST   /api/drops       → @UseGuards → create(dto, userId)
    PATCH  /api/drops/:id   → @UseGuards → update(id, dto, userId)
    DELETE /api/drops/:id   → @UseGuards → delete(id, userId)

  api/src/drops/drops.service.ts
    create(dto, userId): validates merchant ownership; insert into trovea.drops
    delete(id, userId): validates ownership + status = 'draft' before deleting

### Frontend API Client

  src/lib/api/bookings.api.ts
    createBooking(dto): POST /api/bookings
    updateBooking(id, dto): PATCH /api/bookings/:id
    getBookingsByMerchant(): GET /api/bookings
    createWindow(dto): POST /api/windows
    updateWindow(id, dto): PATCH /api/windows/:id
    deleteWindow(id): DELETE /api/windows/:id
    getOpenWindows(merchantId): GET /api/windows/merchant/:merchantId/open

  src/lib/api/drops.api.ts
    createDrop(dto): POST /api/drops
    deleteDrop(id): DELETE /api/drops/:id
    getDropsByMerchant(): GET /api/drops

### Frontend Page + Component Changes

  SchedulePage/ScheduleView.tsx
    Replace FIXTURE_* with useEffect calling getBookingsByMerchant() + getWindowsByMerchant()
    Wire create/edit/delete window buttons to API calls; local state per session

  BookingsPage/BookingsView.tsx
    Replace fixtures with API calls; wire confirm/cancel to updateBooking()

  BookingRequestSheet.tsx
    On confirm: call createBooking() API; show loading; on success proceed to
    confirmation screen and offer WhatsApp as secondary action

  src/lib/utils/host.ts
    isSlotAvailable, getAvailableDays: accept bookings: Booking[] parameter
    instead of importing fixtures; callers pass data fetched from API

  Drop creation UI
    Wire to createDrop() API on submit

### Acceptance Criteria

  - POST /api/bookings creates trovea.bookings row with status = 'pending'
  - Merchant can confirm/cancel bookings; writes to DB
  - Window + drop statuses auto-update via pg_cron
  - Slot availability computed from real DB bookings passed to host.ts utils

---

## Phase 3F — Settings + Merchant Profile

Goal: SettingsPage writes full merchant patch via NestJS.
Studio enquiry form persists. Store pause + store_config changes persist.

### Frontend Quality Audit

  - SettingsPage: trace handleSave() — confirm Zustand store update only, no API call
  - SettingsPage: list fields NOT in save patch: is_paused, pause_message, pause_return_date, store_config
  - SettingsPage: confirm no phone/account number validation exists
  - StorefrontPage studio enquiry submit: confirm WhatsApp-link-only (no API call)

### NestJS Module — merchants (writes)

  api/src/merchants/merchants.controller.ts (add to existing)
    PATCH /api/merchants/me     → @UseGuards → update(dto, userId)
    GET   /api/merchants/me     → @UseGuards → getOwn(userId)

  api/src/merchants/merchants.service.ts (add)
    getOwn(userId): select merchant where owner_id = userId
    update(dto, userId): validates owner_id; updates merchants row
      patch includes: display_name, whatsapp, bio, bank_account,
                      store_config, is_paused, pause_message, pause_return_date,
                      arrival_notes, response_time_hours, whatsapp_template

  api/src/merchants/dto/update-merchant.dto.ts
    class-validator decorators for all fields
    @IsPhoneNumber('NG') for whatsapp
    @Length(10, 10) for account_number when checkout_enabled

### NestJS Module — enquiries

  api/src/enquiries/enquiries.controller.ts
    POST /api/enquiries           → @Public() → create(dto)
    GET  /api/enquiries           → @UseGuards → getByMerchant(userId)
    PATCH /api/enquiries/:id      → @UseGuards → updateStatus(id, dto, userId)

  api/src/enquiries/enquiries.service.ts
    create(dto): insert into trovea.enquiries; return row
    getByMerchant(userId): get merchant by owner_id; select enquiries
    updateStatus(id, dto, userId): validates ownership; update status

### Frontend API Client

  src/lib/api/merchants.api.ts  (add to existing)
    getOwnMerchant(): GET /api/merchants/me
    updateMerchant(dto): PATCH /api/merchants/me

  src/lib/api/enquiries.api.ts
    createEnquiry(dto): POST /api/enquiries
    getEnquiries(): GET /api/enquiries
    updateEnquiryStatus(id, status): PATCH /api/enquiries/:id

### Frontend Store + Page Changes

  merchant.store.ts
    Add saveMerchant(): Promise<boolean>
      calls updateMerchant(merchant) API
      SettingsPage: call updateMerchant(patch) local first, then saveMerchant()
      on error: revert to pre-save snapshot + toast

  SettingsPage.tsx
    handleSave(): add isSaving state; call saveMerchant(); revert + toast on failure
    Patch must include: is_paused, pause_message, pause_return_date, full store_config
    Validation before save: whatsapp (Nigerian format), account_number (10 digits), displayName

  Studio enquiry form
    On submit: call createEnquiry() API; loading spinner; error toast on failure

### Acceptance Criteria

  - PATCH /api/merchants/me writes to trovea.merchants; reload confirms persistence
  - is_paused + store_config persist correctly
  - Validation blocks invalid phone/account at API level (400) and frontend
  - POST /api/enquiries creates trovea.enquiries row

---

## Phase 3G — Admin + Analytics + Realtime

Goal: Admin panel uses DB-backed data via NestJS with server-enforced role checks.
InsightsPage uses real data. Realtime subscription wired for new receipts.

### Frontend Quality Audit

  - RequireAdmin.tsx: confirm it reads user.app_metadata?.role (JWT claim approach)
    — decide between JWT claim (needs Supabase hook) vs API role check per request
  - admin.store.ts: list all mutations (suspend, setTier, setReportStatus) — all local-only
  - admin.store.ts: note admin_id: 'admin-001' hardcode
  - AdminStoresPage, AdminReportsPage: confirm data from DEV_MERCHANTS / FIXTURE_REPORTS
  - InsightsPage: list every fixture import; receipt metrics already real after Phase 3C

### Migrations

  New file: supabase/migrations/009_admin_functions.sql
    - CREATE FUNCTION trovea.custom_access_token_hook(event JSONB) — syncs profiles.role to JWT
      (must also be registered in Supabase Dashboard > Auth > Hooks)
    - Document: GRANT EXECUTE ... TO supabase_auth_admin

### NestJS Module — admin

  api/src/admin/admin.guard.ts
    Extends AuthGuard; additionally checks profile.role === 'admin' from DB
    Returns 403 if not admin

  api/src/admin/admin.controller.ts
    GET    /api/admin/merchants               → @UseGuards(AdminGuard) → getAll(query)
    PATCH  /api/admin/merchants/:id/suspend   → @UseGuards(AdminGuard) → suspend(id, dto, userId)
    PATCH  /api/admin/merchants/:id/unsuspend → @UseGuards(AdminGuard) → unsuspend(id, userId)
    PATCH  /api/admin/merchants/:id/tier      → @UseGuards(AdminGuard) → setTier(id, dto, userId)
    GET    /api/admin/reports                 → @UseGuards(AdminGuard) → getReports()
    PATCH  /api/admin/reports/:id             → @UseGuards(AdminGuard) → updateReport(id, dto, userId)
    GET    /api/admin/log                     → @UseGuards(AdminGuard) → getLog(query)

  api/src/admin/admin.service.ts
    getAll(suspendedOnly): select from merchants; AdminGuard already validated role
    suspend(id, note, adminId): update is_suspended = true; insert admin_log entry
    unsuspend(id, adminId): update is_suspended = false; insert admin_log entry
    setTier(id, tier, adminId): update verification_tier; insert admin_log entry
    getReports(): select from store_reports order by created_at desc
    updateReport(id, status, adminId): update store_reports; insert admin_log entry
    getLog(limit): select from admin_log order by created_at desc

### Frontend API Client

  src/lib/api/admin.api.ts
    getAllMerchants(suspendedOnly?): GET /api/admin/merchants?suspended=true
    suspendMerchant(id, note): PATCH /api/admin/merchants/:id/suspend
    unsuspendMerchant(id): PATCH /api/admin/merchants/:id/unsuspend
    setVerificationTier(id, tier): PATCH /api/admin/merchants/:id/tier
    getReports(): GET /api/admin/reports
    updateReportStatus(id, status): PATCH /api/admin/reports/:id
    getAdminLog(limit?): GET /api/admin/log

### Frontend Store + Component Changes

  RequireAdmin.tsx
    After isAuthenticated: call GET /api/admin/merchants (any endpoint requiring AdminGuard)
    If 403 → redirect to /dashboard. Loading spinner while resolving.
    (No need for Supabase custom hook — NestJS AdminGuard is the authority)

  admin.store.ts
    Add isLoading, error state
    Add initFromDB(): call getAllMerchants() + getReports(); set state
    suspendMerchant, unsuspendMerchant, setMerchantTier, setReportStatus:
      make async; call corresponding admin.api function; update local state on success
      Replace admin_id: 'admin-001' with useAuthStore.getState().user?.id

  Admin pages: Wire to admin.store.initFromDB(). Wire mutation buttons to async actions.

  InsightsPage.tsx
    Receipt metrics: real via useLedgerStore().receipts (real after Phase 3C)
    Drops: useEffect calling getDropsByMerchant() API
    Windows: getWindowsByMerchant() API
    Bookings: getBookingsByMerchant() API
    Enquiries: getEnquiries() API

  Realtime subscription (App.tsx, after merchant loads):
    supabase
      .channel('merchant-receipts')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'trovea', table: 'receipts',
        filter: `merchant_id=eq.${merchant.id}`
      }, (payload) => {
        useLedgerStore.getState().setReceipts(
          [payload.new as Receipt, ...useLedgerStore.getState().receipts]
        );
        useUIStore.getState().addToast('New order received', 'success');
      })
      .subscribe();
    // Store channel ref; unsubscribe in auth.store signOut

### Acceptance Criteria

  - GET /api/admin/merchants returns 403 for non-admin users at the NestJS level
  - Admin suspend/tier actions create admin_log rows in DB
  - InsightsPage shows real metrics derived from ledger receipts
  - New Terminal receipt appears in LedgerPage in real time via Supabase Realtime

---

## Updated Summary: Phase → File Map (NestJS Architecture)

Phase 3A:
  Migrations:  006_missing_columns_and_rpcs.sql
  NestJS new:  api/ scaffold, supabase.service.ts, auth.guard.ts, /api/health
  Frontend:    src/lib/api/client.ts, auth.store fix, App.tsx fixes

Phase 3B:
  Migrations:  —
  NestJS new:  merchants.controller (GET /stores/:handle), products.service (getById),
               receipts.controller (GET /receipts/:sealId)
  Frontend:    merchants.api.ts, receipts.api.ts, StorefrontPage, ItemDetailPage, ReceiptPage

Phase 3C:
  Migrations:  —
  NestJS new:  products.controller (POST/PATCH/DELETE), receipts.controller (POST/PATCH status),
               receipts.service.createReceipt (calls decrement_stock RPC)
  Frontend:    products.api.ts, receipts.api.ts, archive.store, ledger.store, terminal.store

Phase 3D:
  Migrations:  007_claim_hold_rpcs.sql
  NestJS new:  holds.module, claims.module (full CRUD + proof upload)
  Frontend:    holds.api.ts, claims.api.ts, hold.store, HoldSheet, ClaimSheet, StorefrontPage

Phase 3E:
  Migrations:  008_booking_drop_helpers.sql
  NestJS new:  bookings.module (bookings + windows), drops.module
  Frontend:    bookings.api.ts, drops.api.ts, SchedulePage, BookingsPage, BookingRequestSheet

Phase 3F:
  Migrations:  —
  NestJS new:  merchants.controller (PATCH /merchants/me), enquiries.module
  Frontend:    merchants.api.ts update, enquiries.api.ts, merchant.store, SettingsPage

Phase 3G:
  Migrations:  009_admin_functions.sql
  NestJS new:  admin.module (AdminGuard + full CRUD), realtime wired in App.tsx
  Frontend:    admin.api.ts, admin.store, RequireAdmin, admin pages, InsightsPage