import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Plus, ArrowLeft, ArrowRight, ChevronDown, Package } from 'lucide-react';
import { useTerminalStore } from '@/lib/store/terminal.store';
import { FIXTURE_PRODUCTS, FIXTURE_RECEIPTS } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import type { Product } from '@/lib/types';
import styles from './TerminalPage.module.css';

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'opay', label: 'Opay' },
  { value: 'palmpay', label: 'PalmPay' },
  { value: 'moniepoint', label: 'Moniepoint' },
  { value: 'ussd', label: 'USSD' },
] as const;

const stageSlide = {
  initial: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 340, damping: 36 } },
  exit: (dir: number) => ({ x: `${-dir * 100}%`, opacity: 0, transition: { duration: 0.22 } }),
};

export default function TerminalPage() {
  const navigate = useNavigate();
  const {
    stage, visorItems, buyerName, buyerPhone,
    discount, subtotal, discountAmount, total,
    addItem, removeItem, nextStage, prevStage,
    setBuyerName, setBuyerPhone,
    setDiscountExpanded, setDiscountType, setDiscountValue,
    setIssuedReceipt, reset,
  } = useTerminalStore();
  const { addToast } = useUIStore();

  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [sliderX, setSliderX] = useState(0);
  const [isCeremony, setIsCeremony] = useState(false);
  const [stageDir, setStageDir] = useState(1);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const liveProducts = FIXTURE_PRODUCTS.filter(p => p.status === 'live');

  const handleProductTap = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedVariant(null);
      setVariantDrawerOpen(true);
    } else {
      addItem(product);
    }
  };

  const handleVariantConfirm = () => {
    if (!selectedProduct || !selectedVariant) return;
    const variant = selectedProduct.variants?.find(v => v.label === selectedVariant) ?? null;
    addItem(selectedProduct, variant);
    setVariantDrawerOpen(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const goNext = () => {
    setStageDir(1);
    nextStage();
  };

  const goBack = () => {
    setStageDir(-1);
    prevStage();
  };

  const handleSliderDragEnd = () => {
    const trackWidth = sliderTrackRef.current?.offsetWidth ?? 300;
    const threshold = trackWidth * 0.8;
    if (sliderX >= threshold - 48) {
      // Confirmed!
      triggerCeremony();
    } else {
      setSliderX(0);
    }
  };

  const triggerCeremony = async () => {
    setIsCeremony(true);
    await new Promise(r => setTimeout(r, 1600));
    // Use first fixture receipt as the "issued" one for mock
    const mockReceipt = FIXTURE_RECEIPTS[0];
    setIssuedReceipt(mockReceipt);
    setIsCeremony(false);
    reset();
    navigate(`/receipt/${mockReceipt.id}`);
  };

  const canProceed = visorItems.length > 0;
  const canIssue = buyerName.trim().length > 0 && visorItems.length > 0;

  const discountDisplay = discountAmount() > 0 ? `−${formatCurrencyFull(discountAmount())}` : null;

  return (
    <div className={styles.root}>
      {/* ── ZONE A: VISOR ── */}
      <div className={styles.visor} role="region" aria-label="Sale visor">
        <div className={styles.visorHeader}>
          <span className={styles.visorTitle}>Sale Visor</span>
          {visorItems.length > 0 && (
            <span className={styles.visorItemCount}>
              {visorItems.length} item{visorItems.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className={styles.visorItems}>
          {visorItems.length === 0 ? (
            <div className={styles.visorEmpty} aria-label="No items added yet">
              Tap items below to add to sale
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {visorItems.map((item, i) => (
                <motion.div
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
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Discount */}
        <AnimatePresence>
          {discount.expanded && (
            <motion.div
              className={styles.discountExpanded}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.discountTypeToggle}>
                {(['flat', 'percent'] as const).map(t => (
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
                onChange={e => setDiscountValue(Number(e.target.value))}
                min={0}
                aria-label="Discount value"
              />
              {discountDisplay && (
                <span className={styles.discountAmount}>{discountDisplay}</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visor Footer */}
        <div className={styles.visorFooter}>
          <div className={styles.visorTotal}>
            <span className={styles.visorTotalLabel}>
              {discountAmount() > 0 ? 'Total (after discount)' : 'Total'}
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
            <motion.span
              animate={{ rotate: discount.expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={12} aria-hidden="true" />
            </motion.span>
          </button>
        </div>
      </div>

      {/* ── ZONE B: DECK ── */}
      <div className={styles.deck}>
        <div className={styles.stageWrapper}>
          <AnimatePresence mode="wait" custom={stageDir}>

            {/* STAGE 1: COMPOSITION */}
            {stage === 'composition' && (
              <motion.div
                key="composition"
                className={styles.stageComposition}
                custom={stageDir}
                variants={stageSlide}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className={styles.deckHeader}>
                  <span className={styles.deckTitle}>Inventory</span>
                  <button className={styles.quickItemBtn} aria-label="Add quick item (unlisted)">
                    <Plus size={12} aria-hidden="true" />
                    Quick Item
                  </button>
                </div>

                <div className={styles.inventoryGrid} role="list" aria-label="Inventory items">
                  {liveProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      role="listitem"
                      className={`${styles.inventoryCard} ${product.stock_level === 0 ? styles.outOfStock : ''}`}
                      whileTap={product.stock_level > 0 ? { scale: 0.94 } : {}}
                      onClick={() => product.stock_level > 0 && handleProductTap(product)}
                      tabIndex={product.stock_level > 0 ? 0 : -1}
                      aria-label={`${product.name}, ${formatCurrencyFull(product.price)}${product.stock_level === 0 ? ', out of stock' : ''}`}
                      aria-disabled={product.stock_level === 0}
                      onKeyDown={(e) => { if (e.key === 'Enter' && product.stock_level > 0) handleProductTap(product); }}
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
                          {product.stock_level === 0 ? 'Out of stock' : `${product.stock_level} left`}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className={styles.nextBtnWrap}>
                  <button
                    className={styles.nextBtn}
                    onClick={goNext}
                    disabled={!canProceed}
                    aria-label={canProceed ? 'Continue to attribution' : 'Add items to proceed'}
                  >
                    Continue — Attribution
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STAGE 2: ATTRIBUTION */}
            {stage === 'attribution' && (
              <motion.div
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

                  <div className={styles.attrFieldGroup}>
                    <label className={styles.attrLabel} htmlFor="buyer-name">Buyer Name</label>
                    <input
                      id="buyer-name"
                      className={styles.attrInput}
                      type="text"
                      placeholder="Adaeze Okonkwo"
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      autoFocus
                      autoComplete="name"
                      aria-label="Buyer's name"
                      aria-required="true"
                    />
                  </div>

                  <div className={styles.attrFieldGroup}>
                    <label className={styles.attrLabel} htmlFor="buyer-phone">Phone / WhatsApp <span style={{ color: 'var(--color-fg-ghost)', fontFamily: 'var(--font-sans)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      id="buyer-phone"
                      className={styles.attrInput}
                      type="tel"
                      placeholder="+234 801 234 5678"
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      autoComplete="tel"
                      aria-label="Buyer's phone number (optional)"
                    />
                    <span className={styles.attrHint}>Used for WhatsApp receipt delivery.</span>
                  </div>

                  <div className={styles.attrFieldGroup}>
                    <span className={styles.attrLabel} id="payment-method-label">Payment Method <span style={{ color: 'var(--color-fg-ghost)', fontFamily: 'var(--font-sans)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></span>
                    <div className={styles.paymentGrid} role="group" aria-labelledby="payment-method-label">
                      {PAYMENT_METHODS.map(m => (
                        <button
                          key={m.value}
                          className={`${styles.paymentPill} ${paymentMethod === m.value ? styles.selected : ''}`}
                          onClick={() => setPaymentMethod(m.value === paymentMethod ? null : m.value)}
                          aria-pressed={paymentMethod === m.value}
                          aria-label={m.label}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Issue Seal Row */}
                <div className={styles.issueRow}>
                  <button
                    className={styles.backStageBtn}
                    onClick={goBack}
                    aria-label="Go back to composition"
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>

                  {/* Swipe-to-confirm Slider */}
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
                    <motion.div
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
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── CEREMONY OVERLAY ── */}
      <AnimatePresence>
        {isCeremony && (
          <motion.div
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VARIANT PICKER DRAWER ── */}
      <BaseDrawer
        open={variantDrawerOpen}
        onClose={() => { setVariantDrawerOpen(false); setSelectedProduct(null); setSelectedVariant(null); }}
        title={selectedProduct?.name ?? 'Select Variant'}
      >
        {selectedProduct?.variants && (
          <>
            <div className={styles.variantPills} role="group" aria-label="Select a variant">
              {selectedProduct.variants.map(v => (
                <button
                  key={v.label}
                  className={`${styles.variantPill} ${selectedVariant === v.label ? styles.selected : ''} ${v.stock === 0 ? styles.outOfStock : ''}`}
                  onClick={() => v.stock > 0 && setSelectedVariant(v.label)}
                  aria-pressed={selectedVariant === v.label}
                  aria-disabled={v.stock === 0}
                  aria-label={`${v.label}${v.stock === 0 ? ' (out of stock)' : `, ${v.stock} left`}`}
                >
                  {v.label}
                  {v.stock === 0 && <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 8 }}>✕</span>}
                </button>
              ))}
            </div>
            <button
              className={styles.variantConfirmBtn}
              onClick={handleVariantConfirm}
              disabled={!selectedVariant}
              aria-label={selectedVariant ? `Add ${selectedProduct.name} — ${selectedVariant}` : 'Select a variant'}
            >
              {selectedVariant ? `Add ${selectedVariant} →` : 'Select a variant'}
            </button>
          </>
        )}
      </BaseDrawer>
    </div>
  );
}