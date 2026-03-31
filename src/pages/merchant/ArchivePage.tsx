import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Edit2, Eye, EyeOff, Sparkles, Info, MessageCircle, Check, X } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { ProductStatus, ProductType } from '@/lib/types';
import type { ClaimRequest } from '@/lib/types/store-config.types';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import {
  FIXTURE_PRODUCTS,
  FIXTURE_COLLECTIONS,
  FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_HOST_PRODUCTS,
  FIXTURE_STUDIO_PRODUCTS,
  FIXTURE_CLAIMS,
  FIXTURE_MERCHANT,
} from '@/lib/fixtures';
import { parseSmartPaste } from '@/lib/utils/smart-paste';
import { formatCurrencyFull, formatRelativeDate } from '@/lib/utils/format';
import { buildClaimConfirmLink } from '@/lib/utils/whatsapp';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './ArchivePage.module.css';

// ─── Form state ─────────────────────────────────────────────────────────────

interface FormDraft {
  name: string;
  price: string;
  stock: string;
  category: string;
  description: string;
  duration: string;
  depositRequired: boolean;
  depositAmount: string;
  priceType: 'fixed' | 'custom';
  scopeDescription: string;
  deliverables: string;
  timelineEstimate: string;
  depositPct: string;
}

const EMPTY_FORM: FormDraft = {
  name: '',
  price: '',
  stock: '1',
  category: '',
  description: '',
  duration: '',
  depositRequired: false,
  depositAmount: '',
  priceType: 'fixed',
  scopeDescription: '',
  deliverables: '',
  timelineEstimate: '',
  depositPct: '',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const navigate = useNavigate();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);

  const {
    statusFilter, setStatusFilter,
    collectionFilter, setCollectionFilter,
    filteredProducts, ghostCards, setGhostCards,
    mintProducts, toggleProductStatus, updateProduct,
    addProduct, setProducts,
  } = useArchiveStore();
  const { addToast } = useUIStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [dropsView, setDropsView] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);
  const [claims, setClaims] = useState<ClaimRequest[]>(FIXTURE_CLAIMS);
  const [claimReviewProductId, setClaimReviewProductId] = useState<string | null>(null);

  const products = filteredProducts();

  // Redirect Digital Creator to /catalogue
  useEffect(() => {
    if (st.isDigital) navigate('/catalogue', { replace: true });
  }, [st.isDigital, navigate]);

  // Load correct fixture products for active store type
  useEffect(() => {
    switch (merchant.store_type) {
      case 'vendor':          setProducts(FIXTURE_VENDOR_PRODUCTS); break;
      case 'host':            setProducts(FIXTURE_HOST_PRODUCTS); break;
      case 'studio':          setProducts(FIXTURE_STUDIO_PRODUCTS); break;
      case 'digital_creator': /* redirect above handles this */; break;
      default:                setProducts(FIXTURE_PRODUCTS); break;
    }
  }, [merchant.store_type]);

  // Populate form when editing / reset when adding
  useEffect(() => {
    if (!drawerOpen) return;
    if (editTarget) {
      const p = useArchiveStore.getState().products.find((x) => x.id === editTarget);
      if (p) {
        setForm({
          name: p.name,
          price: String(p.price),
          stock: p.stock_level != null ? String(p.stock_level) : '1',
          category: p.tags[0] ?? '',
          description: p.description ?? '',
          duration: p.duration != null ? String(p.duration) : '',
          depositRequired: p.deposit_required,
          depositAmount: p.deposit_amount != null ? String(p.deposit_amount) : '',
          priceType: p.price_type ?? 'fixed',
          scopeDescription: p.scope_description ?? '',
          deliverables: p.deliverables ?? '',
          timelineEstimate: p.timeline_estimate ?? '',
          depositPct: p.deposit_pct != null ? String(p.deposit_pct) : '',
        });
      }
    } else {
      setForm(EMPTY_FORM);
      setPasteText('');
      setGhostCards([]);
    }
  }, [editTarget, drawerOpen]);

  // ── Smart paste handlers ──
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setPasteText(text);
    const parsed = parseSmartPaste(text);
    setGhostCards(parsed.map((p, i) => ({
      ...p, tempId: `ghost-${Date.now()}-${i}`, confirmedName: p.name, confirmedPrice: p.price,
    })));
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteText(val);
    if (val.trim()) {
      const parsed = parseSmartPaste(val);
      setGhostCards(parsed.map((p, i) => ({
        ...p, tempId: `ghost-${Date.now()}-${i}`, confirmedName: p.name, confirmedPrice: p.price,
      })));
    } else {
      setGhostCards([]);
    }
  };

  const canMintFromPaste = ghostCards.length > 0 && ghostCards.every((c) => c.confirmedName && c.confirmedPrice > 0);
  const canAddManual = form.name.trim().length > 0 && (st.isStudio && form.priceType === 'custom' ? true : parseFloat(form.price) > 0);

  // ── Open handlers ──
  const openAdd = () => {
    setEditTarget(null);
    setDropsView(false);
    setDrawerOpen(true);
  };

  const openEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(id);
    setDrawerOpen(true);
  };

  const handleToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleProductStatus(id);
    addToast('Status updated.', 'info');
  };

  // ── Submit handlers ──
  const handleMint = () => {
    if (!canMintFromPaste) return;
    const productType: ProductType = st.isVendor ? 'menu_item' : 'item';
    mintProducts(ghostCards, productType);
    setDrawerOpen(false);
    addToast(`${ghostCards.length} asset${ghostCards.length > 1 ? 's' : ''} minted.`, 'success');
  };

  const handleAddItem = () => {
    if (!canAddManual) return;
    const now = new Date().toISOString();
    const price = parseFloat(form.price) || 0;
    const productType: ProductType = st.isVendor ? 'menu_item' : st.isHost ? 'service' : 'package';
    const newProduct = {
      id: `product-new-${Date.now()}`,
      merchant_id: merchant.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      product_type: productType,
      stock_level: null,
      collection_id: null,
      tags: form.category.trim() ? [form.category.trim()] : [],
      status: 'live' as ProductStatus,
      images: [],
      has_variants: false,
      variant_axis: null,
      variants: null,
      claim_mode: false,
      claim_limit: null,
      duration: form.duration ? parseInt(form.duration) : null,
      deposit_amount: form.depositRequired && form.depositAmount ? parseFloat(form.depositAmount) : null,
      deposit_required: form.depositRequired,
      delivery_url: null,
      is_free: false,
      early_access_price: null,
      early_access_cap: null,
      price_type: st.isStudio ? form.priceType : null,
      scope_description: form.scopeDescription.trim() || null,
      deliverables: form.deliverables.trim() || null,
      timeline_estimate: form.timelineEstimate.trim() || null,
      deposit_pct: form.depositPct ? parseFloat(form.depositPct) : null,
      created_at: now,
      updated_at: now,
    };
    addProduct(newProduct);
    setDrawerOpen(false);
    addToast(`${st.itemLabel} added.`, 'success');
  };

  // ── Claim helpers ──
  const pendingClaimsForProduct = (productId: string) =>
    claims.filter((c) => c.product_id === productId && (c.status === 'pending' || c.status === 'accepted'));

  const allClaimsForProduct = (productId: string) =>
    claims.filter((c) => c.product_id === productId);

  const handleAcceptClaim = (claimId: string) => {
    setClaims((prev) =>
      prev.map((c) => c.id === claimId ? { ...c, status: 'accepted', updated_at: new Date().toISOString() } : c)
    );
    const claim = claims.find((c) => c.id === claimId);
    if (claim) {
      const product = useArchiveStore.getState().products.find((p) => p.id === claim.product_id);
      const link = buildClaimConfirmLink({
        phone: claim.buyer_phone || FIXTURE_MERCHANT.whatsapp,
        itemName: product?.name ?? claim.product_id,
        price: product?.price ?? 0,
        storeName: merchant.store_name,
      });
      window.open(link, '_blank', 'noopener,noreferrer');
    }
    addToast('Claim accepted. Message sent to buyer.', 'success');
  };

  const handleDeclineClaim = (claimId: string) => {
    setClaims((prev) =>
      prev.map((c) => c.id === claimId ? { ...c, status: 'declined', updated_at: new Date().toISOString() } : c)
    );
    addToast('Claim declined.', 'info');
  };

  const handleSaveEdit = () => {
    if (!editTarget || !form.name.trim()) return;
    updateProduct(editTarget, {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: parseFloat(form.price) || 0,
      ...(st.isCollector ? { stock_level: parseInt(form.stock) || 0 } : {}),
      ...(st.isVendor ? { tags: form.category.trim() ? [form.category.trim()] : [] } : {}),
      ...(st.isHost ? {
        duration: form.duration ? parseInt(form.duration) : null,
        deposit_required: form.depositRequired,
        deposit_amount: form.depositRequired && form.depositAmount ? parseFloat(form.depositAmount) : null,
      } : {}),
      ...(st.isStudio ? {
        price_type: form.priceType,
        scope_description: form.scopeDescription.trim() || null,
        deliverables: form.deliverables.trim() || null,
        timeline_estimate: form.timelineEstimate.trim() || null,
        deposit_pct: form.depositPct ? parseFloat(form.depositPct) : null,
      } : {}),
    });
    addToast('Changes saved.', 'success');
    setDrawerOpen(false);
  };

  // ── Status tab config ──
  type TabValue = ProductStatus | 'all';
  const statusTabs: { value: TabValue; label: string }[] = st.isCollector
    ? [
        { value: 'all', label: 'All' },
        { value: 'live', label: 'Live' },
        { value: 'hidden', label: 'Hidden' },
        { value: 'sold_out', label: 'Sold Out' },
      ]
    : st.isVendor
    ? [
        { value: 'all', label: 'All' },
        { value: 'live', label: 'Active' },
        { value: 'hidden', label: 'Hidden' },
      ]
    : [
        { value: 'all', label: 'All' },
        { value: 'live', label: 'Active' },
        { value: 'hidden', label: 'Inactive' },
      ];

  // ── Drawer content ──
  const drawerTitle = editTarget
    ? `Edit ${st.itemLabel}`
    : st.isCollector ? `Mint ${st.itemLabel}` : `Add ${st.itemLabel}`;

  const showSmartPaste = (st.isCollector || st.isVendor) && !editTarget;

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{st.archiveLabel}</h1>
          <span className={styles.itemCount}>
            {products.length} {products.length === 1 ? st.itemLabel : st.itemsLabel}
          </span>
        </div>
        <div className={styles.headerActions}>
          <m.button
            className={styles.addBtn}
            onClick={openAdd}
            aria-label={`Add new ${st.itemLabel}`}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={14} aria-hidden="true" />
            + {st.itemLabel}
          </m.button>
        </div>
      </div>

      {/* Status tabs + Drops tab (Collector only) */}
      <div className={styles.tabsRow}>
        <div
          className={`${styles.statusTabs} ${dropsView ? styles.statusTabsFaded : ''}`}
          role="tablist"
          aria-label="Filter by status"
        >
          {statusTabs.map((tab) => (
            <m.button
              key={tab.value}
              className={`${styles.statusTab} ${statusFilter === tab.value && !dropsView ? styles.active : ''}`}
              onClick={() => { setDropsView(false); setStatusFilter(tab.value); }}
              role="tab"
              aria-selected={statusFilter === tab.value && !dropsView}
              aria-label={`Show ${tab.label} items`}
              whileTap={{ scale: 0.96 }}
            >
              {tab.label}
            </m.button>
          ))}
        </div>

        {st.isCollector && (
          <m.button
            className={`${styles.dropsTab} ${dropsView ? styles.dropsTabActive : ''}`}
            onClick={() => setDropsView((v) => !v)}
            aria-pressed={dropsView}
            aria-label="View drops"
            whileTap={{ scale: 0.97 }}
          >
            Drops
          </m.button>
        )}
      </div>

      {/* Collection chips (Collector only) */}
      {st.isCollector && !dropsView && (
        <div className={styles.collectionsRow} aria-label="Filter by collection">
          <button
            className={`${styles.collectionChip} ${collectionFilter === null ? styles.active : ''}`}
            onClick={() => setCollectionFilter(null)}
            aria-label="All collections"
            aria-pressed={collectionFilter === null}
          >
            All
          </button>
          {FIXTURE_COLLECTIONS.map((col) => (
            <button
              key={col.id}
              className={`${styles.collectionChip} ${collectionFilter === col.id ? styles.active : ''}`}
              onClick={() => setCollectionFilter(col.id)}
              aria-label={col.name}
              aria-pressed={collectionFilter === col.id}
            >
              <span className={styles.collectionChipDot} style={{ background: col.color_accent }} aria-hidden="true" />
              {col.name}
            </button>
          ))}
          <button className={styles.newCollectionChip} aria-label="Add new collection">
            <Plus size={10} aria-hidden="true" />
            New Collection
          </button>
        </div>
      )}

      {/* Drops placeholder (Collector drops tab) */}
      {st.isCollector && dropsView ? (
        <m.div
          className={styles.dropsPlaceholder}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className={styles.dropsPlaceholderIcon} aria-hidden="true">
            <Info size={20} />
          </div>
          <h3 className={styles.dropsPlaceholderTitle}>Drop Scheduling</h3>
          <p className={styles.dropsPlaceholderText}>
            Drop scheduling is coming in a future update. You'll be able to schedule, announce, and manage timed drops directly from your archive.
          </p>
        </m.div>
      ) : (
        /* Product list */
        products.length === 0 ? (
          <div className={styles.emptyState} role="status">
            <span className={styles.emptyIcon}>—</span>
            <h2 className={styles.emptyTitle}>
              {st.isCollector ? 'The Archive is Empty' : `No ${st.itemsLabel} Yet`}
            </h2>
            <p className={styles.emptyText}>
              {st.isCollector
                ? 'No items match this filter. Adjust your filters or mint a new asset.'
                : `Add your first ${st.itemLabel.toLowerCase()} to get started.`}
            </p>
          </div>
        ) : (
          <div className={styles.productList} role="list">
            <AnimatePresence initial={false}>
              {products.map((product, i) => (
                <m.div
                  key={product.id}
                  role="listitem"
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0 }}
                  transition={{ duration: 0.22, delay: i * 0.03 }}
                  className={styles.productRow}
                  onClick={() => openEdit(product.id, { stopPropagation: () => {} } as React.MouseEvent)}
                  tabIndex={0}
                  aria-label={`${product.name}, ${product.price_type === 'custom' ? 'Custom' : formatCurrencyFull(product.price)}, ${product.status}`}
                  onKeyDown={(e) => { if (e.key === 'Enter') openEdit(product.id, e as unknown as React.MouseEvent); }}
                  whileTap={{ scale: 0.995 }}
                >
                  {/* Thumbnail */}
                  <div className={styles.rowThumb} aria-hidden="true">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className={styles.rowThumbImg} loading="lazy" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-ghost)' }}>
                        <Package size={20} />
                      </div>
                    )}
                    {/* Stock badge — Collector only */}
                    {st.isCollector && product.stock_level != null && product.stock_level <= 2 && product.stock_level > 0 && (
                      <span className={`${styles.stockBadge} ${styles.low}`} aria-label={`${product.stock_level} left`}>
                        {product.stock_level}
                      </span>
                    )}
                    {st.isCollector && product.stock_level === 0 && (
                      <span className={`${styles.stockBadge} ${styles.out}`} aria-label="Sold out">0</span>
                    )}
                  </div>

                  {/* Body */}
                  <div className={styles.rowBody}>
                    <div className={styles.rowName}>{product.name}</div>
                    <div className={styles.rowMeta}>
                      {/* Collector: collection + status pill + variants count */}
                      {st.isCollector && (
                        <>
                          {product.collection_id && (
                            <span className={styles.rowCollection}>
                              {FIXTURE_COLLECTIONS.find((c) => c.id === product.collection_id)?.name ?? ''}
                            </span>
                          )}
                          <span className={`${styles.rowStatusPill} ${styles[product.status]}`}>
                            {product.status.replace('_', ' ')}
                          </span>
                          {product.variants && (
                            <span className={styles.rowCollection}>{product.variants.length} variants</span>
                          )}
                        </>
                      )}
                      {/* Host: duration + deposit badge */}
                      {st.isHost && (
                        <>
                          {product.duration != null && (
                            <span className={styles.durationBadge}>{product.duration} min</span>
                          )}
                          {product.deposit_required && product.deposit_amount != null && (
                            <span className={styles.depositBadge}>
                              {formatCurrencyFull(product.deposit_amount)} deposit
                            </span>
                          )}
                        </>
                      )}
                      {/* Studio: price_type + timeline */}
                      {st.isStudio && (
                        <>
                          <span className={`${styles.priceTypeBadge} ${product.price_type === 'custom' ? styles.priceTypeBadgeCustom : ''}`}>
                            {product.price_type === 'custom' ? 'QUOTE' : 'FIXED'}
                          </span>
                          {product.timeline_estimate && (
                            <span className={styles.rowCollection}>{product.timeline_estimate}</span>
                          )}
                        </>
                      )}
                      {/* Vendor: no meta */}
                    </div>
                  </div>

                  {/* Price */}
                  {st.isStudio && product.price_type === 'custom' ? (
                    <span className={styles.rowPriceCustom}>Custom</span>
                  ) : (
                    <span className={styles.rowPrice}>{formatCurrencyFull(product.price)}</span>
                  )}

                  {/* Collector: pending claim badge */}
                  {st.isCollector && (() => {
                    const count = pendingClaimsForProduct(product.id).length;
                    return count > 0 ? (
                      <m.button
                        className={styles.claimBadgeBtn}
                        onClick={(e) => { e.stopPropagation(); setClaimReviewProductId(product.id); }}
                        aria-label={`${count} pending claim${count > 1 ? 's' : ''} — review`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {count} pending claim{count > 1 ? 's' : ''}
                      </m.button>
                    ) : null;
                  })()}

                  {/* Actions */}
                  <div className={styles.rowActions}>
                    <m.button
                      className={styles.rowActionBtn}
                      onClick={(e) => openEdit(product.id, e)}
                      aria-label={`Edit ${product.name}`}
                      whileTap={{ scale: 0.93 }}
                    >
                      <Edit2 size={14} aria-hidden="true" />
                    </m.button>
                    <m.button
                      className={styles.rowActionBtn}
                      onClick={(e) => handleToggle(product.id, e)}
                      aria-label={product.status === 'live'
                        ? (st.isHost || st.isStudio ? 'Deactivate' : 'Hide item')
                        : (st.isHost || st.isStudio ? 'Activate' : 'Show item')}
                      whileTap={{ scale: 0.93 }}
                    >
                      {product.status === 'live'
                        ? <EyeOff size={14} aria-hidden="true" />
                        : <Eye size={14} aria-hidden="true" />}
                    </m.button>
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )
      )}

      {/* Add / Edit Drawer */}
      <BaseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="bottom"
        title={drawerTitle}
      >
        <div className={styles.drawerForm}>

          {/* ── COLLECTOR: Smart Paste flow ── */}
          {st.isCollector && !editTarget && (
            <>
              <div className={styles.drawerSection}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span className={styles.drawerLabel}>Smart Paste</span>
                  <span className={styles.smartBadge}>Auto-parse</span>
                </div>
                <textarea
                  className={styles.drawerTextarea}
                  placeholder={'Paste a WhatsApp caption:\n\n✨ Ankara Wrap Dress\n₦22,000 | Available: 3\nSizes: S, M, L'}
                  value={pasteText}
                  onChange={handlePasteChange}
                  onPaste={handlePaste}
                  aria-label="Paste product caption"
                  rows={4}
                />
              </div>
              <AnimatePresence>
                {ghostCards.length > 0 && (
                  <m.div className={styles.ghostCards} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {ghostCards.map((card, i) => (
                      <m.div key={card.tempId} className={styles.ghostCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.08 }}>
                        <div className={styles.ghostCardIcon} aria-hidden="true"><Package size={14} /></div>
                        <div className={styles.ghostCardBody}>
                          <div className={styles.ghostCardName}>{card.confirmedName}</div>
                          <div className={styles.ghostCardMeta}>Qty: {card.quantity}{card.variantHints.length > 0 && ` · ${card.variantHints.join(', ')}`}</div>
                        </div>
                        <div>
                          {card.confirmedPrice > 0
                            ? <span className={styles.ghostCardPrice}>{formatCurrencyFull(card.confirmedPrice)}</span>
                            : <span className={styles.ghostCardPriceError}>No price</span>}
                        </div>
                      </m.div>
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
              <button
                className={styles.mintBtn}
                onClick={handleMint}
                disabled={!canMintFromPaste}
                aria-label={canMintFromPaste ? `Mint ${ghostCards.length} asset${ghostCards.length > 1 ? 's' : ''}` : 'Mint Assets'}
              >
                <Sparkles size={14} aria-hidden="true" />
                {canMintFromPaste ? `Mint ${ghostCards.length} Asset${ghostCards.length > 1 ? 's' : ''}` : 'Paste items above to mint'}
              </button>
            </>
          )}

          {/* ── COLLECTOR: Edit form ── */}
          {st.isCollector && editTarget && (
            <>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="edit-name">Name</label>
                <input id="edit-name" className={styles.drawerInput} type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Item name" />
              </div>
              <div className={styles.drawerRow}>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="edit-price">Price (₦)</label>
                  <input id="edit-price" className={styles.drawerInput} type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Price" />
                </div>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="edit-stock">Stock</label>
                  <input id="edit-stock" className={styles.drawerInput} type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} min={0} aria-label="Stock level" />
                </div>
              </div>
              <button className={styles.mintBtn} onClick={handleSaveEdit} disabled={!form.name.trim()} aria-label="Save changes">Save Changes</button>
            </>
          )}

          {/* ── VENDOR: Add form (Smart Paste + manual) ── */}
          {st.isVendor && !editTarget && (
            <>
              <div className={styles.drawerSection}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span className={styles.drawerLabel}>Smart Paste</span>
                  <span className={styles.smartBadge}>Auto-parse</span>
                </div>
                <textarea className={styles.drawerTextarea} placeholder={'Paste a menu caption:\n\n🍛 Jollof Rice (Full Pot)\n₦8,500 | Available every Saturday'} value={pasteText} onChange={handlePasteChange} onPaste={handlePaste} aria-label="Paste menu caption" rows={3} />
              </div>
              <AnimatePresence>
                {ghostCards.length > 0 && (
                  <m.div className={styles.ghostCards} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {ghostCards.map((card, i) => (
                      <m.div key={card.tempId} className={styles.ghostCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.08 }}>
                        <div className={styles.ghostCardIcon} aria-hidden="true"><Package size={14} /></div>
                        <div className={styles.ghostCardBody}>
                          <div className={styles.ghostCardName}>{card.confirmedName}</div>
                          <div className={styles.ghostCardMeta}>Qty: {card.quantity}</div>
                        </div>
                        {card.confirmedPrice > 0
                          ? <span className={styles.ghostCardPrice}>{formatCurrencyFull(card.confirmedPrice)}</span>
                          : <span className={styles.ghostCardPriceError}>No price</span>}
                      </m.div>
                    ))}
                  </m.div>
                )}
              </AnimatePresence>
              {canMintFromPaste && (
                <button className={styles.mintBtn} onClick={handleMint} aria-label={`Mint ${ghostCards.length} menu item${ghostCards.length > 1 ? 's' : ''}`}>
                  <Sparkles size={14} aria-hidden="true" />
                  Mint {ghostCards.length} Menu Item{ghostCards.length > 1 ? 's' : ''}
                </button>
              )}
              {!canMintFromPaste && (
                <>
                  <div className={styles.drawerDivider}>
                    <div className={styles.drawerDividerLine} />
                    <span className={styles.drawerDividerText}>or fill in manually</span>
                    <div className={styles.drawerDividerLine} />
                  </div>
                  <div className={styles.drawerSection}>
                    <label className={styles.drawerLabel} htmlFor="vendor-name">Item Name</label>
                    <input id="vendor-name" className={styles.drawerInput} type="text" placeholder="Jollof Rice (Full Pot)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Item name" />
                  </div>
                  <div className={styles.drawerRow}>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="vendor-price">Price (₦)</label>
                      <input id="vendor-price" className={styles.drawerInput} type="number" placeholder="8500" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Price" />
                    </div>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="vendor-category">Category</label>
                      <input id="vendor-category" className={styles.drawerInput} type="text" placeholder="e.g. Rice Dishes" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} aria-label="Category (optional)" />
                    </div>
                  </div>
                  <div className={styles.drawerSection}>
                    <label className={styles.drawerLabel} htmlFor="vendor-desc">Description <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(optional)</span></label>
                    <textarea id="vendor-desc" className={styles.drawerTextarea} placeholder="e.g. Smoky party jollof, cooked in firewood. Serves 4–6." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} aria-label="Description" />
                  </div>
                  <p className={styles.imagePlaceholder}>Image upload — coming soon.</p>
                  <button className={styles.mintBtn} onClick={handleAddItem} disabled={!canAddManual} aria-label="Add menu item">Add Menu Item</button>
                </>
              )}
            </>
          )}

          {/* ── VENDOR: Edit form ── */}
          {st.isVendor && editTarget && (
            <>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="vendor-edit-name">Name</label>
                <input id="vendor-edit-name" className={styles.drawerInput} type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Item name" />
              </div>
              <div className={styles.drawerRow}>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="vendor-edit-price">Price (₦)</label>
                  <input id="vendor-edit-price" className={styles.drawerInput} type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Price" />
                </div>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="vendor-edit-cat">Category</label>
                  <input id="vendor-edit-cat" className={styles.drawerInput} type="text" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} aria-label="Category" />
                </div>
              </div>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="vendor-edit-desc">Description <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(optional)</span></label>
                <textarea id="vendor-edit-desc" className={styles.drawerTextarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} aria-label="Description" />
              </div>
              <button className={styles.mintBtn} onClick={handleSaveEdit} disabled={!form.name.trim()} aria-label="Save changes">Save Changes</button>
            </>
          )}

          {/* ── HOST: Add form ── */}
          {st.isHost && !editTarget && (
            <>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="host-name">Service Name</label>
                <input id="host-name" className={styles.drawerInput} type="text" placeholder="Classic Lash Set" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Service name" />
              </div>
              <div className={styles.drawerRow}>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="host-duration">Duration (min)</label>
                  <input id="host-duration" className={styles.drawerInput} type="number" placeholder="60" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} min={0} aria-label="Duration in minutes" />
                </div>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="host-price">Price (₦)</label>
                  <input id="host-price" className={styles.drawerInput} type="number" placeholder="25000" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Price" />
                </div>
              </div>
              <div
                className={styles.toggleRow}
                onClick={() => setForm((f) => ({ ...f, depositRequired: !f.depositRequired }))}
                role="switch"
                aria-checked={form.depositRequired}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setForm((f) => ({ ...f, depositRequired: !f.depositRequired })); }}
              >
                <div className={styles.toggleLabel}>Deposit Required</div>
                <div className={`${styles.toggleControl} ${form.depositRequired ? styles.toggleOn : ''}`} aria-hidden="true">
                  <div className={styles.toggleThumb} />
                </div>
              </div>
              <AnimatePresence>
                {form.depositRequired && (
                  <m.div className={styles.drawerSection} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <label className={styles.drawerLabel} htmlFor="host-deposit">Deposit Amount (₦)</label>
                    <input id="host-deposit" className={styles.drawerInput} type="number" placeholder="5000" value={form.depositAmount} onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))} min={0} aria-label="Deposit amount" />
                  </m.div>
                )}
              </AnimatePresence>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="host-desc">Description <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(optional)</span></label>
                <textarea id="host-desc" className={styles.drawerTextarea} placeholder="e.g. Full classic lash extension set, suitable for all eye shapes." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} aria-label="Description" />
              </div>
              <button className={styles.mintBtn} onClick={handleAddItem} disabled={!canAddManual} aria-label="Add service">Add Service</button>
            </>
          )}

          {/* ── HOST: Edit form ── */}
          {st.isHost && editTarget && (
            <>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="host-edit-name">Name</label>
                <input id="host-edit-name" className={styles.drawerInput} type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Service name" />
              </div>
              <div className={styles.drawerRow}>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="host-edit-dur">Duration (min)</label>
                  <input id="host-edit-dur" className={styles.drawerInput} type="number" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} min={0} aria-label="Duration in minutes" />
                </div>
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="host-edit-price">Price (₦)</label>
                  <input id="host-edit-price" className={styles.drawerInput} type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Price" />
                </div>
              </div>
              <div
                className={styles.toggleRow}
                onClick={() => setForm((f) => ({ ...f, depositRequired: !f.depositRequired }))}
                role="switch"
                aria-checked={form.depositRequired}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setForm((f) => ({ ...f, depositRequired: !f.depositRequired })); }}
              >
                <div className={styles.toggleLabel}>Deposit Required</div>
                <div className={`${styles.toggleControl} ${form.depositRequired ? styles.toggleOn : ''}`} aria-hidden="true">
                  <div className={styles.toggleThumb} />
                </div>
              </div>
              <AnimatePresence>
                {form.depositRequired && (
                  <m.div className={styles.drawerSection} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <label className={styles.drawerLabel} htmlFor="host-edit-dep">Deposit Amount (₦)</label>
                    <input id="host-edit-dep" className={styles.drawerInput} type="number" value={form.depositAmount} onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))} min={0} aria-label="Deposit amount" />
                  </m.div>
                )}
              </AnimatePresence>
              <button className={styles.mintBtn} onClick={handleSaveEdit} disabled={!form.name.trim()} aria-label="Save changes">Save Changes</button>
            </>
          )}

          {/* ── STUDIO: Add form ── */}
          {st.isStudio && !editTarget && (
            <>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-name">Package Name</label>
                <input id="studio-name" className={styles.drawerInput} type="text" placeholder="Brand Starter Package" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Package name" />
              </div>
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Price Type</span>
                <div className={styles.priceTypeRow}>
                  <m.button className={`${styles.priceTypeBtn} ${form.priceType === 'fixed' ? styles.priceTypeBtnActive : ''}`} onClick={() => setForm((f) => ({ ...f, priceType: 'fixed' }))} type="button" aria-pressed={form.priceType === 'fixed'} whileTap={{ scale: 0.97 }}>Fixed</m.button>
                  <m.button className={`${styles.priceTypeBtn} ${form.priceType === 'custom' ? styles.priceTypeBtnActive : ''}`} onClick={() => setForm((f) => ({ ...f, priceType: 'custom' }))} type="button" aria-pressed={form.priceType === 'custom'} whileTap={{ scale: 0.97 }}>Custom Quote</m.button>
                </div>
              </div>
              <AnimatePresence>
                {form.priceType === 'fixed' && (
                  <m.div className={styles.drawerRow} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="studio-price">Price (₦)</label>
                      <input id="studio-price" className={styles.drawerInput} type="number" placeholder="150000" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Package price" />
                    </div>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="studio-deposit-pct">Deposit % <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(opt)</span></label>
                      <input id="studio-deposit-pct" className={styles.drawerInput} type="number" placeholder="30" value={form.depositPct} onChange={(e) => setForm((f) => ({ ...f, depositPct: e.target.value }))} min={0} max={100} aria-label="Deposit percentage" />
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-scope">Scope Description <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(optional)</span></label>
                <textarea id="studio-scope" className={styles.drawerTextarea} placeholder="e.g. Full brand identity shoot for small businesses. Studio or location." value={form.scopeDescription} onChange={(e) => setForm((f) => ({ ...f, scopeDescription: e.target.value }))} rows={3} aria-label="Scope description" />
              </div>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-deliverables">Deliverables <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(optional)</span></label>
                <textarea id="studio-deliverables" className={styles.drawerTextarea} placeholder="e.g. 20 retouched images, 3 reels, 1 hero shot" value={form.deliverables} onChange={(e) => setForm((f) => ({ ...f, deliverables: e.target.value }))} rows={2} aria-label="Deliverables" />
              </div>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-timeline">Timeline Estimate <span style={{ color: 'var(--color-fg-ghost)', textTransform: 'none', letterSpacing: 0, fontFamily: 'var(--font-sans)' }}>(optional)</span></label>
                <input id="studio-timeline" className={styles.drawerInput} type="text" placeholder="e.g. 3–5 business days" value={form.timelineEstimate} onChange={(e) => setForm((f) => ({ ...f, timelineEstimate: e.target.value }))} aria-label="Timeline estimate" />
              </div>
              <button className={styles.mintBtn} onClick={handleAddItem} disabled={!canAddManual} aria-label="Add package">Add Package</button>
            </>
          )}

          {/* ── STUDIO: Edit form ── */}
          {st.isStudio && editTarget && (
            <>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-edit-name">Name</label>
                <input id="studio-edit-name" className={styles.drawerInput} type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} aria-label="Package name" />
              </div>
              <div className={styles.drawerSection}>
                <span className={styles.drawerLabel}>Price Type</span>
                <div className={styles.priceTypeRow}>
                  <m.button className={`${styles.priceTypeBtn} ${form.priceType === 'fixed' ? styles.priceTypeBtnActive : ''}`} onClick={() => setForm((f) => ({ ...f, priceType: 'fixed' }))} type="button" aria-pressed={form.priceType === 'fixed'} whileTap={{ scale: 0.97 }}>Fixed</m.button>
                  <m.button className={`${styles.priceTypeBtn} ${form.priceType === 'custom' ? styles.priceTypeBtnActive : ''}`} onClick={() => setForm((f) => ({ ...f, priceType: 'custom' }))} type="button" aria-pressed={form.priceType === 'custom'} whileTap={{ scale: 0.97 }}>Custom Quote</m.button>
                </div>
              </div>
              <AnimatePresence>
                {form.priceType === 'fixed' && (
                  <m.div className={styles.drawerRow} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="studio-edit-price">Price (₦)</label>
                      <input id="studio-edit-price" className={styles.drawerInput} type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} min={0} aria-label="Package price" />
                    </div>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="studio-edit-dep">Deposit %</label>
                      <input id="studio-edit-dep" className={styles.drawerInput} type="number" value={form.depositPct} onChange={(e) => setForm((f) => ({ ...f, depositPct: e.target.value }))} min={0} max={100} aria-label="Deposit percentage" />
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-edit-scope">Scope Description</label>
                <textarea id="studio-edit-scope" className={styles.drawerTextarea} value={form.scopeDescription} onChange={(e) => setForm((f) => ({ ...f, scopeDescription: e.target.value }))} rows={3} aria-label="Scope description" />
              </div>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-edit-del">Deliverables</label>
                <textarea id="studio-edit-del" className={styles.drawerTextarea} value={form.deliverables} onChange={(e) => setForm((f) => ({ ...f, deliverables: e.target.value }))} rows={2} aria-label="Deliverables" />
              </div>
              <div className={styles.drawerSection}>
                <label className={styles.drawerLabel} htmlFor="studio-edit-time">Timeline Estimate</label>
                <input id="studio-edit-time" className={styles.drawerInput} type="text" value={form.timelineEstimate} onChange={(e) => setForm((f) => ({ ...f, timelineEstimate: e.target.value }))} aria-label="Timeline estimate" />
              </div>
              <button className={styles.mintBtn} onClick={handleSaveEdit} disabled={!form.name.trim()} aria-label="Save changes">Save Changes</button>
            </>
          )}
        </div>
      </BaseDrawer>

      {/* ── Claim Review Drawer (Collector only) ── */}
      {st.isCollector && (
        <BaseDrawer
          open={claimReviewProductId !== null}
          onClose={() => setClaimReviewProductId(null)}
          position="bottom"
          title="Claim Review"
        >
          {claimReviewProductId && (() => {
            const reviewProduct = useArchiveStore.getState().products.find((p) => p.id === claimReviewProductId);
            const reviewClaims = allClaimsForProduct(claimReviewProductId);
            return (
              <div className={styles.claimReviewBody}>
                {reviewProduct && (
                  <div className={styles.claimReviewProductRow}>
                    <div className={styles.claimReviewThumb}>
                      {reviewProduct.images[0]
                        ? <img src={reviewProduct.images[0]} alt={reviewProduct.name} />
                        : <Package size={18} />}
                    </div>
                    <div className={styles.claimReviewProductInfo}>
                      <p className={styles.claimReviewProductName}>{reviewProduct.name}</p>
                      <p className={styles.claimReviewProductPrice}>{formatCurrencyFull(reviewProduct.price)}</p>
                    </div>
                  </div>
                )}

                {reviewClaims.length === 0 ? (
                  <p className={styles.claimReviewEmpty}>No claims for this item.</p>
                ) : (
                  <div className={styles.claimList} role="list">
                    <AnimatePresence initial={false}>
                      {reviewClaims.map((claim) => (
                        <m.div
                          key={claim.id}
                          role="listitem"
                          className={`${styles.claimRow} ${claim.status === 'declined' ? styles.claimRowDeclined : ''}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className={styles.claimRowLeft}>
                            <div className={styles.claimRowName}>{claim.buyer_name}</div>
                            <div className={styles.claimRowMeta}>
                              {claim.buyer_phone && (
                                <span className={styles.claimRowPhone}>{claim.buyer_phone}</span>
                              )}
                              <span className={styles.claimRowTime}>{formatRelativeDate(claim.created_at)}</span>
                            </div>
                            {claim.buyer_note && (
                              <p className={styles.claimRowNote}>"{claim.buyer_note}"</p>
                            )}
                          </div>
                          <div className={styles.claimRowRight}>
                            <span className={`${styles.claimStatusChip} ${styles[`claimStatus_${claim.status}`]}`}>
                              {claim.status}
                            </span>
                            {(claim.status === 'pending') && (
                              <div className={styles.claimRowActions}>
                                <m.button
                                  className={`${styles.claimActionBtn} ${styles.claimActionAccept}`}
                                  onClick={() => handleAcceptClaim(claim.id)}
                                  aria-label={`Accept claim from ${claim.buyer_name}`}
                                  whileTap={{ scale: 0.93 }}
                                >
                                  <Check size={12} />
                                  Accept
                                </m.button>
                                <m.button
                                  className={`${styles.claimActionBtn} ${styles.claimActionDecline}`}
                                  onClick={() => handleDeclineClaim(claim.id)}
                                  aria-label={`Decline claim from ${claim.buyer_name}`}
                                  whileTap={{ scale: 0.93 }}
                                >
                                  <X size={12} />
                                  Decline
                                </m.button>
                              </div>
                            )}
                            {claim.status === 'accepted' && reviewProduct && (
                              <a
                                href={buildClaimConfirmLink({
                                  phone: claim.buyer_phone || FIXTURE_MERCHANT.whatsapp,
                                  itemName: reviewProduct.name,
                                  price: reviewProduct.price,
                                  storeName: merchant.store_name,
                                })}
                                className={`${styles.claimActionBtn} ${styles.claimActionWhatsapp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Message ${claim.buyer_name} on WhatsApp`}
                              >
                                <MessageCircle size={12} />
                                Message
                              </a>
                            )}
                          </div>
                        </m.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })()}
        </BaseDrawer>
      )}
    </div>
  );
}
