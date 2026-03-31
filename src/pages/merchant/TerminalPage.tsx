import { useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  X, Plus, ArrowLeft, ArrowRight, ChevronDown, Package,
  Calendar, Clock,
} from 'lucide-react';
import { m, AnimatePresence, useDragControls } from '@/lib/motion';
import type { Product, ProductVariant, ReceiptType } from '@/lib/types';
import { useTerminalStore } from '@/lib/store/terminal.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import {
  FIXTURE_PRODUCTS,
  FIXTURE_RECEIPTS,
  FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_PRODUCTS,
  FIXTURE_WINDOWS,
  FIXTURE_BOOKINGS,
} from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './TerminalPage.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'opay', label: 'Opay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
  { value: 'ussd', label: 'USSD' },
] as const;

const HOST_SLOT_HOURS = [9, 11, 13, 15]; // 9am, 11am, 1pm, 3pm

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the next N weekdays starting from tomorrow */
function getNextWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cursor));
    }
  }
  return days;
}

function isSlotBooked(date: Date, hour: number, merchantId: string): boolean {
  return FIXTURE_BOOKINGS
    .filter((b) => b.merchant_id === merchantId && b.status !== 'cancelled')
    .some((b) => {
      const bt = new Date(b.scheduled_at);
      return (
        bt.toDateString() === date.toDateString() &&
        bt.getHours() === hour
      );
    });
}

function formatSlotTime(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'am' : 'pm';
  return `${h}:00${ampm}`;
}

function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatWindowClose(isoString: string): string {
  const d = new Date(isoString);
  const datePart = d.toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timePart = d.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart}, ${timePart}`;
}

// ─── Animation variant ───────────────────────────────────────────────────────

const stageSlide = {
  initial: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 340, damping: 36 } },
  exit: (dir: number) => ({ x: `${-dir * 100}%`, opacity: 0, transition: { duration: 0.22 } }),
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TerminalPage() {
  const navigate = useNavigate();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);

  const {
    stage, visorItems,
    buyerName, buyerPhone, buyerEmail,
    discount, deliveryFee, deliveryFeeExpanded,
    subtotal, discountAmount, total,
    addItem, removeItem, addQuickItem,
    nextStage, prevStage,
    setBuyerName, setBuyerPhone, setBuyerEmail,
    setDiscountExpanded, setDiscountType, setDiscountValue,
    setDeliveryFee, setDeliveryFeeExpanded,
    setIssuedReceipt, reset,
  } = useTerminalStore();
  const { addToast } = useUIStore();

  // ── Stage direction ──
  const [stageDir, setStageDir] = useState(1);

  // ── Variant picker (Collector) ──
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  // ── Quick Item drawer (Collector + Studio) ──
  const [quickDrawerOpen, setQuickDrawerOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickNameLocked, setQuickNameLocked] = useState(false); // Studio: name pre-filled

  // ── Host slot picker ──
  const [hostStep, setHostStep] = useState<1 | 2>(1);
  const [hostService, setHostService] = useState<Product | null>(null);
  const [hostDate, setHostDate] = useState<Date | null>(null);

  // ── Attribution ──
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  // ── Issuance slider ──
  const [sliderX, setSliderX] = useState(0);
  const [isCeremony, setIsCeremony] = useState(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // ─── Computed data ─────────────────────────────────────────────────────────

  const weekdays = useMemo(() => getNextWeekdays(3), []);

  const vendorWindow = useMemo(
    () => FIXTURE_WINDOWS.find(
      (w) => w.merchant_id === merchant.id && w.status === 'open'
    ) ?? null,
    [merchant.id]
  );

  const showDeliveryFee = st.isCollector || st.isVendor || st.isStudio;

  // Label for delivery fee
  const deliveryFeeLabel =
    st.isStudio ? 'Logistics fee' :
    'Delivery fee';

  // Visor title
  const visorTitle = `${st.receiptLabel} Visor`;

  const canProceed = visorItems.length > 0;
  const canIssue =
    buyerName.trim().length > 0 && visorItems.length > 0;

  const discountDisplay = discountAmount() > 0
    ? `−${formatCurrencyFull(discountAmount())}`
    : null;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const goNext = () => { setStageDir(1); nextStage(); };
  const goBack = () => { setStageDir(-1); prevStage(); };

  // Collector & Digital & Vendor: tap to add
  const handleProductTap = (product: Product) => {
    if (product.has_variants && product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedVariant(null);
      setVariantDrawerOpen(true);
    } else {
      addItem(product);
    }
  };

  const handleVariantConfirm = () => {
    if (!selectedProduct || !selectedVariant) return;
    const variant = selectedProduct.variants?.find((v) => v.label === selectedVariant) ?? null;
    addItem(selectedProduct, variant);
    setVariantDrawerOpen(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  // Host: Step 1 service select
  const handleHostServiceSelect = (service: Product) => {
    setHostService(service);
    setHostDate(null);
    setHostStep(2);
  };

  // Host: Step 2 slot select → add to visor + go to attribution
  const handleHostSlotSelect = (date: Date, hour: number) => {
    if (!hostService) return;
    const dateStr = formatWeekdayShort(date);
    const timeStr = formatSlotTime(hour);
    const slotVariant: ProductVariant = {
      id: `slot-${date.toDateString()}-${hour}`,
      label: `${dateStr} · ${timeStr}`,
      price_override: null,
      stock_level: 1,
      status: 'live',
      display_order: 1,
    };
    addItem(hostService, slotVariant);
    setStageDir(1);
    nextStage();
  };

  // Studio: fixed package → add directly; custom → open custom price drawer
  const handleStudioPackageTap = (pkg: Product) => {
    if (pkg.price_type === 'custom') {
      setQuickName(pkg.name);
      setQuickPrice('');
      setQuickNameLocked(true);
      setQuickDrawerOpen(true);
    } else {
      addItem(pkg);
    }
  };

  const openQuickItem = () => {
    setQuickName('');
    setQuickPrice('');
    setQuickNameLocked(false);
    setQuickDrawerOpen(true);
  };

  const handleQuickItemConfirm = () => {
    const name = quickName.trim();
    const price = Number(quickPrice);
    if (!name || isNaN(price) || price < 0) {
      addToast('Enter a name and valid price', 'error');
      return;
    }
    addQuickItem(name, price);
    setQuickDrawerOpen(false);
    setQuickName('');
    setQuickPrice('');
    setQuickNameLocked(false);
  };

  // Issuance
  const handleSliderDragEnd = () => {
    const trackWidth = sliderTrackRef.current?.offsetWidth ?? 300;
    const threshold = trackWidth * 0.8;
    if (sliderX >= threshold - 48) {
      triggerCeremony();
    } else {
      setSliderX(0);
    }
  };

  const triggerCeremony = async () => {
    setIsCeremony(true);
    await new Promise((r) => setTimeout(r, 1600));

    const receiptType: ReceiptType =
      st.isVendor  ? 'order'    :
      st.isHost    ? 'booking'  :
      st.isDigital ? 'download' :
      st.isStudio  ? 'project'  :
      'sale';

    const baseReceipt = FIXTURE_RECEIPTS[0];
    const mockReceipt = {
      ...baseReceipt,
      receipt_type: receiptType,
      buyer_name: buyerName || baseReceipt.buyer_name,
      buyer_phone: st.isDigital ? null : (buyerPhone || baseReceipt.buyer_phone),
      buyer_email: st.isDigital ? (buyerEmail || null) : null,
      delivery_fee: deliveryFee > 0 ? deliveryFee : null,
    };

    setIssuedReceipt(mockReceipt);
    setIsCeremony(false);
    reset();
    navigate(`/receipt/${baseReceipt.id}`);
  };

  // ─── Visor breakdown ───────────────────────────────────────────────────────

  const showBreakdown = deliveryFee > 0 || discountAmount() > 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* ── ZONE A: VISOR ── */}
      <div className={styles.visor} role="region" aria-label={visorTitle}>
        <div className={styles.visorHeader}>
          <span className={styles.visorTitle}>{visorTitle}</span>
          {visorItems.length > 0 && (
            <span className={styles.visorItemCount}>
              {visorItems.length} item{visorItems.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className={styles.visorItems}>
          {visorItems.length === 0 ? (
            <div className={styles.visorEmpty} aria-label="No items added yet">
              {st.isHost
                ? 'Select a service and slot below'
                : st.isStudio
                  ? 'Tap a package below to add'
                  : 'Tap items below to add to sale'}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visorItems.map((item, i) => (
                <m.div
                  key={`${item.productId}-${item.variantLabel}-${i}`}
                  className={styles.visorItem}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.visorItemName}>{item.name}</div>
                    {item.variantLabel && (
                      <div className={styles.visorItemVariant}>{item.variantLabel}</div>
                    )}
                  </div>
                  <span className={styles.visorItemQty}>×{item.quantity}</span>
                  <span className={styles.visorItemPrice}>{formatCurrencyFull(item.totalPrice)}</span>
                  <button
                    className={styles.visorRemoveBtn}
                    onClick={() => removeItem(i)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </m.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Discount expanded (in visor) */}
        <AnimatePresence>
          {discount.expanded && (
            <m.div
              className={styles.discountExpanded}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.discountTypeToggle}>
                {(['flat', 'percent'] as const).map((t) => (
                  <button
                    key={t}
                    className={`${styles.discountTypeBtn} ${discount.type === t ? styles.active : ''}`}
                    onClick={() => setDiscountType(t)}
                    aria-label={t === 'flat' ? 'Flat amount discount' : 'Percentage discount'}
                  >
                    {t === 'flat' ? '₦' : '%'}
                  </button>
                ))}
              </div>
              <input
                className={styles.discountInput}
                type="number"
                placeholder={discount.type === 'flat' ? 'Amount' : 'Percent'}
                value={discount.value || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={0}
                aria-label="Discount value"
              />
              {discountDisplay && (
                <span className={styles.discountAmount}>{discountDisplay}</span>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Visor breakdown (subtotal + delivery + discount) */}
        <AnimatePresence>
          {showBreakdown && (
            <m.div
              className={styles.visorBreakdown}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className={styles.visorBreakdownRow}>
                <span>Subtotal</span>
                <span>{formatCurrencyFull(subtotal())}</span>
              </div>
              {deliveryFee > 0 && (
                <div className={styles.visorBreakdownRow}>
                  <span>Delivery</span>
                  <span>+{formatCurrencyFull(deliveryFee)}</span>
                </div>
              )}
              {discountAmount() > 0 && (
                <div className={styles.visorBreakdownRow}>
                  <span>Discount</span>
                  <span>−{formatCurrencyFull(discountAmount())}</span>
                </div>
              )}
              <div className={styles.visorBreakdownDivider} aria-hidden="true" />
            </m.div>
          )}
        </AnimatePresence>

        {/* Visor footer */}
        <div className={styles.visorFooter}>
          <div className={styles.visorTotal}>
            <span className={styles.visorTotalLabel}>
              {showBreakdown ? 'Total' : (discountAmount() > 0 ? 'Total (after discount)' : 'Total')}
            </span>
            <span className={styles.visorTotalAmount}>{formatCurrencyFull(total())}</span>
          </div>
          <button
            className={styles.discountToggle}
            onClick={() => setDiscountExpanded(!discount.expanded)}
            aria-label={discount.expanded ? 'Collapse discount' : 'Add discount'}
            aria-expanded={discount.expanded}
          >
            Discount
            <m.span
              animate={{ rotate: discount.expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={12} aria-hidden="true" />
            </m.span>
          </button>
        </div>
      </div>

      {/* ── ZONE B: DECK ── */}
      <div className={styles.deck}>
        <div className={styles.stageWrapper}>
          <AnimatePresence mode="wait" custom={stageDir}>

            {/* ═══════════════════════════════════════════
                STAGE 1: COMPOSITION (branches per type)
            ═══════════════════════════════════════════ */}
            {stage === 'composition' && (
              <m.div
                key="composition"
                className={styles.stageComposition}
                custom={stageDir}
                variants={stageSlide}
                initial="initial"
                animate="animate"
                exit="exit"
              >

                {/* ── COLLECTOR ── */}
                {st.isCollector && (
                  <>
                    <div className={styles.deckHeader}>
                      <span className={styles.deckTitle}>Inventory</span>
                      <m.button
                        className={styles.quickItemBtn}
                        aria-label="Add quick item (unlisted)"
                        whileTap={{ scale: 0.95 }}
                        onClick={openQuickItem}
                      >
                        <Plus size={12} aria-hidden="true" />
                        Quick Item
                      </m.button>
                    </div>

                    <div className={styles.inventoryGrid} role="list" aria-label="Inventory items">
                      {FIXTURE_PRODUCTS
                        .filter((p) => p.status === 'live')
                        .map((product) => {
                          const stockOk = product.stock_level === null || product.stock_level > 0;
                          return (
                            <m.div
                              key={product.id}
                              role="listitem"
                              className={`${styles.inventoryCard} ${!stockOk ? styles.outOfStock : ''}`}
                              whileTap={stockOk ? { scale: 0.94 } : {}}
                              onClick={() => stockOk && handleProductTap(product)}
                              tabIndex={stockOk ? 0 : -1}
                              aria-label={`${product.name}, ${formatCurrencyFull(product.price)}${!stockOk ? ', out of stock' : ''}`}
                              aria-disabled={!stockOk}
                              onKeyDown={(e) => { if (e.key === 'Enter' && stockOk) handleProductTap(product); }}
                            >
                              <div className={styles.inventoryThumb} aria-hidden="true">
                                {product.images[0] ? (
                                  <img src={product.images[0]} alt={product.name} loading="lazy" />
                                ) : (
                                  <div className={styles.inventoryThumbPlaceholder}>
                                    <Package size={20} />
                                  </div>
                                )}
                                {product.claim_mode && (
                                  <span className={styles.claimBadge} aria-label="Claim mode">Claim</span>
                                )}
                              </div>
                              <div className={styles.inventoryBody}>
                                <div className={styles.inventoryName}>{product.name}</div>
                                <div className={styles.inventoryPrice}>{formatCurrencyFull(product.price)}</div>
                                <div className={styles.inventoryStock}>
                                  {!stockOk
                                    ? 'Out of stock'
                                    : product.stock_level !== null
                                      ? `${product.stock_level} left`
                                      : 'In stock'}
                                </div>
                              </div>
                            </m.div>
                          );
                        })}
                    </div>

                    <div className={styles.nextBtnWrap}>
                      <m.button
                        className={styles.nextBtn}
                        onClick={goNext}
                        disabled={!canProceed}
                        aria-label={canProceed ? 'Continue to attribution' : 'Add items to proceed'}
                        whileTap={canProceed ? { scale: 0.98 } : {}}
                      >
                        Continue — Attribution
                        <ArrowRight size={14} aria-hidden="true" />
                      </m.button>
                    </div>
                  </>
                )}

                {/* ── VENDOR ── */}
                {st.isVendor && (
                  <>
                    {vendorWindow ? (
                      <>
                        <div className={styles.windowBanner} aria-label="Active window">
                          <span className={styles.windowBannerLabel}>Window</span>
                          <span className={styles.windowBannerName}>{vendorWindow.label}</span>
                          <span className={styles.windowBannerClose}>
                            Closes {formatWindowClose(vendorWindow.closes_at)}
                          </span>
                        </div>

                        <div className={styles.inventoryGrid} role="list" aria-label="Menu items">
                          {FIXTURE_VENDOR_PRODUCTS
                            .filter((p) => p.status === 'live')
                            .map((product) => (
                              <m.div
                                key={product.id}
                                role="listitem"
                                className={styles.inventoryCard}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => handleProductTap(product)}
                                tabIndex={0}
                                aria-label={`${product.name}, ${formatCurrencyFull(product.price)}`}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleProductTap(product); }}
                              >
                                <div className={styles.inventoryThumb} aria-hidden="true">
                                  {product.images[0] ? (
                                    <img src={product.images[0]} alt={product.name} loading="lazy" />
                                  ) : (
                                    <div className={styles.inventoryThumbPlaceholder}>
                                      <Package size={20} />
                                    </div>
                                  )}
                                </div>
                                <div className={styles.inventoryBody}>
                                  <div className={styles.inventoryName}>{product.name}</div>
                                  <div className={styles.inventoryPrice}>{formatCurrencyFull(product.price)}</div>
                                </div>
                              </m.div>
                            ))}
                        </div>

                        <div className={styles.nextBtnWrap}>
                          <m.button
                            className={styles.nextBtn}
                            onClick={goNext}
                            disabled={!canProceed}
                            aria-label={canProceed ? 'Continue to attribution' : 'Add items to proceed'}
                            whileTap={canProceed ? { scale: 0.98 } : {}}
                          >
                            Continue — Attribution
                            <ArrowRight size={14} aria-hidden="true" />
                          </m.button>
                        </div>
                      </>
                    ) : (
                      <div className={styles.noWindowState} role="status">
                        <div className={styles.noWindowIcon} aria-hidden="true">
                          <Clock size={36} />
                        </div>
                        <h2 className={styles.noWindowTitle}>No active window.</h2>
                        <p className={styles.noWindowText}>
                          Open a window in Schedule to start taking orders.
                        </p>
                        <Link to="/schedule" className={styles.noWindowCta}>
                          Go to Schedule
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {/* ── HOST ── */}
                {st.isHost && (
                  <>
                    {hostStep === 1 && (
                      <>
                        <div className={styles.deckHeader}>
                          <span className={styles.deckTitle}>Select Service</span>
                          <span className={styles.deckSubtitle}>Step 1 of 2</span>
                        </div>
                        <div
                          className={styles.serviceList}
                          role="list"
                          aria-label="Available services"
                        >
                          {FIXTURE_HOST_PRODUCTS
                            .filter((p) => p.status === 'live')
                            .map((service) => (
                              <m.div
                                key={service.id}
                                role="listitem"
                                className={`${styles.serviceRow} ${hostService?.id === service.id ? styles.serviceRowSelected : ''}`}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => handleHostServiceSelect(service)}
                                tabIndex={0}
                                aria-label={`${service.name}, ${formatCurrencyFull(service.price)}, ${service.duration} minutes`}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleHostServiceSelect(service); }}
                              >
                                <div className={styles.serviceRowInfo}>
                                  <span className={styles.serviceRowName}>{service.name}</span>
                                  <div className={styles.serviceRowMeta}>
                                    {service.duration && (
                                      <span className={styles.durationChip}>
                                        <Clock size={10} aria-hidden="true" />
                                        {service.duration} min
                                      </span>
                                    )}
                                    {service.deposit_required && service.deposit_amount && (
                                      <span className={styles.depositChip}>
                                        ₦{service.deposit_amount.toLocaleString()} deposit
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={styles.serviceRowPrice}>
                                  {formatCurrencyFull(service.price)}
                                </span>
                              </m.div>
                            ))}
                        </div>
                      </>
                    )}

                    {hostStep === 2 && hostService && (
                      <>
                        <div className={styles.deckHeader}>
                          <m.button
                            className={styles.hostBackBtn}
                            onClick={() => { setHostStep(1); setHostDate(null); }}
                            aria-label="Back to service selection"
                            whileTap={{ scale: 0.95 }}
                          >
                            <ArrowLeft size={14} aria-hidden="true" />
                          </m.button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className={styles.deckTitle}>Select Slot — {hostService.name}</span>
                          </div>
                          <span className={styles.deckSubtitle}>Step 2 of 2</span>
                        </div>

                        <div className={styles.slotGrid} role="list" aria-label="Available time slots">
                          {weekdays.map((day) => (
                            <div key={day.toDateString()} className={styles.slotDateGroup}>
                              <div className={styles.slotDate}>
                                <Calendar size={11} aria-hidden="true" />
                                {formatWeekdayShort(day)}
                              </div>
                              <div className={styles.slotTimesRow} role="group" aria-label={`Slots for ${formatWeekdayShort(day)}`}>
                                {HOST_SLOT_HOURS.map((hour) => {
                                  const booked = isSlotBooked(day, hour, merchant.id);
                                  return (
                                    <m.button
                                      key={hour}
                                      className={`${styles.slotTime} ${booked ? styles.slotTimeBooked : ''}`}
                                      onClick={() => !booked && handleHostSlotSelect(day, hour)}
                                      disabled={booked}
                                      aria-label={`${formatSlotTime(hour)} on ${formatWeekdayShort(day)}${booked ? ' — booked' : ''}`}
                                      aria-disabled={booked}
                                      whileTap={!booked ? { scale: 0.94 } : {}}
                                    >
                                      {formatSlotTime(hour)}
                                      {booked && (
                                        <span className={styles.slotBookedLabel}>Booked</span>
                                      )}
                                    </m.button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* ── DIGITAL CREATOR ── */}
                {st.isDigital && (
                  <>
                    <div className={styles.deckHeader}>
                      <span className={styles.deckTitle}>Catalogue</span>
                    </div>
                    <div className={styles.inventoryGrid} role="list" aria-label="Digital products">
                      {FIXTURE_DIGITAL_PRODUCTS
                        .filter((p) => p.status !== 'hidden')
                        .map((product) => (
                          <m.div
                            key={product.id}
                            role="listitem"
                            className={styles.inventoryCard}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => handleProductTap(product)}
                            tabIndex={0}
                            aria-label={`${product.name}, ${product.is_free ? 'Free' : formatCurrencyFull(product.price)}`}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleProductTap(product); }}
                          >
                            <div className={styles.inventoryThumb} aria-hidden="true">
                              {product.images[0] ? (
                                <img src={product.images[0]} alt={product.name} loading="lazy" />
                              ) : (
                                <div className={styles.inventoryThumbPlaceholder}>
                                  <Package size={20} />
                                </div>
                              )}
                              {product.is_free && (
                                <span className={styles.freeBadge} aria-label="Free product">Free</span>
                              )}
                            </div>
                            <div className={styles.inventoryBody}>
                              <div className={styles.inventoryName}>{product.name}</div>
                              <div className={styles.inventoryPrice}>
                                {product.is_free ? (
                                  <span className={styles.freePrice}>Free</span>
                                ) : (
                                  formatCurrencyFull(product.price)
                                )}
                              </div>
                            </div>
                          </m.div>
                        ))}
                    </div>
                    <div className={styles.nextBtnWrap}>
                      <m.button
                        className={styles.nextBtn}
                        onClick={goNext}
                        disabled={!canProceed}
                        aria-label={canProceed ? 'Continue to attribution' : 'Add products to proceed'}
                        whileTap={canProceed ? { scale: 0.98 } : {}}
                      >
                        Continue — Attribution
                        <ArrowRight size={14} aria-hidden="true" />
                      </m.button>
                    </div>
                  </>
                )}

                {/* ── STUDIO ── */}
                {st.isStudio && (
                  <>
                    <div className={styles.deckHeader}>
                      <span className={styles.deckTitle}>Packages</span>
                    </div>
                    <div
                      className={styles.studioPackageList}
                      role="list"
                      aria-label="Studio packages"
                    >
                      {FIXTURE_STUDIO_PRODUCTS
                        .filter((p) => p.status === 'live')
                        .map((pkg) => (
                          <m.div
                            key={pkg.id}
                            role="listitem"
                            className={styles.studioPackageRow}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => handleStudioPackageTap(pkg)}
                            tabIndex={0}
                            aria-label={`${pkg.name}, ${pkg.price_type === 'custom' ? 'Custom price' : formatCurrencyFull(pkg.price)}`}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleStudioPackageTap(pkg); }}
                          >
                            <div className={styles.studioPackageInfo}>
                              <span className={styles.studioPackageName}>{pkg.name}</span>
                              {pkg.scope_description && (
                                <span className={styles.studioPackageScope}>{pkg.scope_description}</span>
                              )}
                              {pkg.timeline_estimate && (
                                <span className={styles.studioPackageTimeline}>
                                  {pkg.timeline_estimate}
                                </span>
                              )}
                            </div>
                            <div className={styles.studioPackagePriceCol}>
                              {pkg.price_type === 'custom' ? (
                                <span className={styles.studioPackageCustomPrice}>Quote</span>
                              ) : (
                                <span className={styles.studioPackagePrice}>{formatCurrencyFull(pkg.price)}</span>
                              )}
                              <span className={styles.studioPackageTypeBadge}>
                                {pkg.price_type === 'custom' ? 'Custom' : 'Fixed'}
                              </span>
                            </div>
                          </m.div>
                        ))}
                    </div>

                    <div className={styles.nextBtnWrap} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                        <m.button
                          className={styles.quickItemBtn}
                          onClick={openQuickItem}
                          aria-label="Add custom line item"
                          whileTap={{ scale: 0.95 }}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <Plus size={12} aria-hidden="true" />
                          Custom Line
                        </m.button>
                      </div>
                      <m.button
                        className={styles.nextBtn}
                        onClick={goNext}
                        disabled={!canProceed}
                        aria-label={canProceed ? 'Continue to attribution' : 'Add a package to proceed'}
                        whileTap={canProceed ? { scale: 0.98 } : {}}
                      >
                        Continue — Attribution
                        <ArrowRight size={14} aria-hidden="true" />
                      </m.button>
                    </div>
                  </>
                )}

              </m.div>
            )}

            {/* ═══════════════════════════════════════════
                STAGE 2: ATTRIBUTION
            ═══════════════════════════════════════════ */}
            {stage === 'attribution' && (
              <m.div
                key="attribution"
                className={styles.stageAttribution}
                custom={stageDir}
                variants={stageSlide}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className={styles.attributionForm}>
                  <h2 className={styles.attrSectionTitle}>Who's buying?</h2>

                  {/* Buyer Name */}
                  <div className={styles.attrFieldGroup}>
                    <label className={styles.attrLabel} htmlFor="buyer-name">
                      Buyer Name
                    </label>
                    <input
                      id="buyer-name"
                      className={styles.attrInput}
                      type="text"
                      placeholder={
                        st.isHost ? 'Adaeze Okonkwo' :
                        st.isDigital ? 'Femi Ogundimu' :
                        'Adaeze Okonkwo'
                      }
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      autoFocus
                      autoComplete="name"
                      aria-label="Buyer's name"
                      aria-required="true"
                    />
                  </div>

                  {/* Buyer Contact — adapts per type */}
                  <div className={styles.attrFieldGroup}>
                    {st.isDigital ? (
                      <>
                        <label className={styles.attrLabel} htmlFor="buyer-email">
                          Email Address{' '}
                          <span className={styles.attrLabelOptional}>(for delivery)</span>
                        </label>
                        <input
                          id="buyer-email"
                          className={styles.attrInput}
                          type="email"
                          placeholder="femi@example.com"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          autoComplete="email"
                          aria-label="Buyer's email address for delivery"
                        />
                        <span className={styles.attrHint}>
                          Used to deliver the download link.
                        </span>
                      </>
                    ) : (
                      <>
                        <label className={styles.attrLabel} htmlFor="buyer-phone">
                          WhatsApp Number{' '}
                          <span className={styles.attrLabelOptional}>(optional)</span>
                        </label>
                        <input
                          id="buyer-phone"
                          className={styles.attrInput}
                          type="tel"
                          placeholder="+234 801 234 5678"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          autoComplete="tel"
                          aria-label="Buyer's WhatsApp number (optional)"
                        />
                        <span className={styles.attrHint}>Used for WhatsApp receipt delivery.</span>
                      </>
                    )}
                  </div>

                  {/* Delivery Fee — Collector, Vendor, Studio only */}
                  {showDeliveryFee && (
                    <div className={styles.attrFieldGroup}>
                      <span className={styles.attrLabel} id="delivery-fee-label">
                        {deliveryFeeLabel}
                      </span>
                      <AnimatePresence initial={false}>
                        {deliveryFeeExpanded ? (
                          <m.div
                            className={styles.deliveryFeeExpanded}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                          >
                            <span className={styles.deliveryFeeSymbol}>₦</span>
                            <input
                              className={styles.deliveryFeeInput}
                              type="number"
                              placeholder="0"
                              value={deliveryFee || ''}
                              onChange={(e) => setDeliveryFee(Number(e.target.value))}
                              min={0}
                              aria-labelledby="delivery-fee-label"
                              autoFocus
                            />
                            <m.button
                              className={styles.deliveryFeeRemoveBtn}
                              onClick={() => {
                                setDeliveryFeeExpanded(false);
                                setDeliveryFee(0);
                              }}
                              aria-label="Remove delivery fee"
                              whileTap={{ scale: 0.95 }}
                            >
                              Remove
                            </m.button>
                          </m.div>
                        ) : (
                          <m.div
                            className={styles.deliveryFeeRow}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <span className={styles.deliveryFeeRowLabel}>
                              {deliveryFee > 0
                                ? `+${formatCurrencyFull(deliveryFee)}`
                                : 'None — tap to add'}
                            </span>
                            <m.button
                              className={styles.deliveryFeeAddBtn}
                              onClick={() => setDeliveryFeeExpanded(true)}
                              aria-label="Add delivery fee"
                              whileTap={{ scale: 0.95 }}
                            >
                              <Plus size={12} aria-hidden="true" />
                            </m.button>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className={styles.attrFieldGroup}>
                    <span className={styles.attrLabel} id="payment-method-label">
                      Payment Method{' '}
                      <span className={styles.attrLabelOptional}>(optional)</span>
                    </span>
                    <div
                      className={styles.paymentGrid}
                      role="group"
                      aria-labelledby="payment-method-label"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <m.button
                          key={pm.value}
                          className={`${styles.paymentPill} ${paymentMethod === pm.value ? styles.selected : ''}`}
                          onClick={() => setPaymentMethod(pm.value === paymentMethod ? null : pm.value)}
                          aria-pressed={paymentMethod === pm.value}
                          aria-label={pm.label}
                          whileTap={{ scale: 0.95 }}
                        >
                          {pm.label}
                        </m.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Back + Issue row */}
                <div className={styles.issueRow}>
                  <m.button
                    className={styles.backStageBtn}
                    onClick={goBack}
                    aria-label="Go back to composition"
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                  </m.button>

                  {/* Slide-to-confirm */}
                  <div
                    className={styles.sliderWrap}
                    ref={sliderTrackRef}
                    role="button"
                    aria-label="Slide to issue seal"
                    aria-disabled={!canIssue}
                  >
                    <div
                      className={styles.sliderFill}
                      style={{ width: `${sliderX + 48}px` }}
                      aria-hidden="true"
                    />
                    <span className={styles.sliderLabel} aria-hidden="true">
                      {canIssue ? 'Slide to Issue Seal →' : 'Enter buyer name first'}
                    </span>
                    <m.div
                      className={styles.sliderThumb}
                      drag={canIssue ? 'x' : false}
                      dragControls={dragControls}
                      dragConstraints={sliderTrackRef}
                      dragElastic={0}
                      dragMomentum={false}
                      animate={{ x: sliderX }}
                      onDrag={(_, info) => {
                        const trackWidth = sliderTrackRef.current?.offsetWidth ?? 300;
                        setSliderX(Math.max(0, Math.min(info.point.x - 24, trackWidth - 52)));
                      }}
                      onDragEnd={handleSliderDragEnd}
                      style={{ opacity: canIssue ? 1 : 0.3 }}
                      aria-hidden="true"
                    >
                      <ArrowRight size={20} aria-hidden="true" />
                    </m.div>
                  </div>
                </div>
              </m.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ── CEREMONY OVERLAY ── */}
      <AnimatePresence>
        {isCeremony && (
          <m.div
            className={styles.stageCeremony}
            role="status"
            aria-label="Issuing seal, please wait"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.ceremonyRing} aria-hidden="true" />
            <div className={styles.ceremonyLogo} aria-hidden="true">
              Trove<span className={styles.ceremonyApostrophe}>'</span>a
            </div>
            <p className={styles.ceremonyText}>Issuing Seal…</p>
          </m.div>
        )}
      </AnimatePresence>

      {/* ── VARIANT PICKER DRAWER (Collector) ── */}
      <BaseDrawer
        open={variantDrawerOpen}
        onClose={() => {
          setVariantDrawerOpen(false);
          setSelectedProduct(null);
          setSelectedVariant(null);
        }}
        title={selectedProduct?.name ?? 'Select Variant'}
      >
        {selectedProduct?.variants && (
          <>
            <div className={styles.variantPills} role="group" aria-label="Select a variant">
              {selectedProduct.variants.map((v) => (
                <m.button
                  key={v.label}
                  className={`${styles.variantPill} ${selectedVariant === v.label ? styles.selected : ''} ${v.stock_level === 0 ? styles.outOfStock : ''}`}
                  onClick={() => v.stock_level > 0 && setSelectedVariant(v.label)}
                  aria-pressed={selectedVariant === v.label}
                  aria-disabled={v.stock_level === 0}
                  aria-label={`${v.label}${v.stock_level === 0 ? ' (out of stock)' : `, ${v.stock_level} left`}`}
                  whileTap={v.stock_level > 0 ? { scale: 0.95 } : {}}
                >
                  {v.label}
                  {v.stock_level === 0 && (
                    <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 8 }}>✕</span>
                  )}
                </m.button>
              ))}
            </div>
            <m.button
              className={styles.variantConfirmBtn}
              onClick={handleVariantConfirm}
              disabled={!selectedVariant}
              aria-label={selectedVariant ? `Add ${selectedProduct.name} — ${selectedVariant}` : 'Select a variant'}
              whileTap={selectedVariant ? { scale: 0.98 } : {}}
            >
              {selectedVariant ? `Add ${selectedVariant} →` : 'Select a variant'}
            </m.button>
          </>
        )}
      </BaseDrawer>

      {/* ── QUICK ITEM / CUSTOM LINE DRAWER (Collector + Studio) ── */}
      <BaseDrawer
        open={quickDrawerOpen}
        onClose={() => {
          setQuickDrawerOpen(false);
          setQuickName('');
          setQuickPrice('');
          setQuickNameLocked(false);
        }}
        title={quickNameLocked ? `Enter amount — ${quickName}` : 'Quick Item'}
      >
        <div className={styles.quickItemForm}>
          {!quickNameLocked && (
            <div className={styles.attrFieldGroup}>
              <label className={styles.attrLabel} htmlFor="quick-item-name">Item Name</label>
              <input
                id="quick-item-name"
                className={styles.attrInput}
                type="text"
                placeholder="Item name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                autoFocus
                aria-label="Quick item name"
              />
            </div>
          )}
          <div className={styles.attrFieldGroup}>
            <label className={styles.attrLabel} htmlFor="quick-item-price">
              {quickNameLocked ? `Amount for ${quickName}` : 'Price (₦)'}
            </label>
            <div className={styles.priceInputWrap}>
              <span className={styles.priceSymbol}>₦</span>
              <input
                id="quick-item-price"
                className={`${styles.attrInput} ${styles.priceInput}`}
                type="number"
                placeholder="0"
                value={quickPrice}
                onChange={(e) => setQuickPrice(e.target.value)}
                min={0}
                autoFocus={quickNameLocked}
                aria-label="Price in naira"
              />
            </div>
          </div>
          <m.button
            className={styles.variantConfirmBtn}
            onClick={handleQuickItemConfirm}
            disabled={!quickName.trim() || quickPrice === ''}
            aria-label="Add item to visor"
            whileTap={{ scale: 0.98 }}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {quickNameLocked ? `Add ${quickName} →` : 'Add to Visor →'}
          </m.button>
        </div>
      </BaseDrawer>

    </div>
  );
}
