import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Package, Edit2, Eye, EyeOff, Sparkles, Info,
  MessageCircle, Check, X, ChevronDown, ChevronRight,
  Copy, Layers
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { Product, ProductStatus, ProductType, Drop } from '@/lib/types';
import type { ClaimRequest } from '@/lib/types';
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
  FIXTURE_DROPS,
  FIXTURE_RECEIPTS,
  FIXTURE_BOOKINGS,
  FIXTURE_ENQUIRIES,
} from '@/lib/fixtures';
import { parseSmartPaste } from '@/lib/utils/smart-paste';
import { formatCurrencyFull, formatRelativeDate } from '@/lib/utils/format';
import { buildClaimConfirmLink } from '@/lib/utils/whatsapp';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './ArchivePage.module.css';

// ─── ProductRow (module-scope to prevent remount on parent renders) ───────────

interface ProductRowProps {
  product: Product;
  index: number;
  merchantId: string;
  drops: Drop[];
  fulfilmentMap: Record<string, string>;
  statusFilter: string;
  stagePopoverId: string | null;
  inlineEditId: string | null;
  isSoldOutPulse: boolean;
  onEdit: (id: string) => void;
  onToggle: (id: string, e: React.MouseEvent) => void;
  onStage: (productId: string, dropId: string) => void;
  onDuplicate: (product: Product) => void;
  onCycleFulfilment: (productId: string, e: React.MouseEvent) => void;
  onSetStagePopover: (id: string | null) => void;
  onSetInlineEdit: (id: string | null) => void;
}

function ProductRow({
  product, index, merchantId, drops, fulfilmentMap, statusFilter,
  stagePopoverId, inlineEditId, isSoldOutPulse,
  onEdit, onToggle, onStage, onDuplicate, onCycleFulfilment,
  onSetStagePopover, onSetInlineEdit,
}: ProductRowProps) {
  const st = useStoreType();
  const isSoldOut  = product.status === 'sold_out' || product.stock_level === 0;
  const isLowStock = !isSoldOut && product.stock_level != null && product.stock_level > 0 && product.stock_level <= 2;

  const dropBadge = useMemo(() => {
    if (!st.isCollector) return null;
    const drop = drops.find(d => d.merchant_id === merchantId && d.status !== 'completed' && d.product_ids.includes(product.id));
    return drop ? `IN ${drop.label.split('—')[0].trim()}` : null;
  }, [st.isCollector, drops, merchantId, product.id]);

  const bookingCount = useMemo(() => {
    if (!st.isHost) return 0;
    return FIXTURE_BOOKINGS.filter(b => b.service_id === product.id).length;
  }, [st.isHost, product.id]);

  const conversion = useMemo(() => {
    if (!st.isStudio) return null;
    const enqs = FIXTURE_ENQUIRIES.filter(e => e.package_id === product.id);
    const conf = enqs.filter(e => ['active_project', 'completed'].includes(e.status)).length;
    return { total: enqs.length, confirmed: conf };
  }, [st.isStudio, product.id]);

  return (
    <m.div
      role="listitem"
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
      className={`${styles.productRow} ${isSoldOutPulse ? styles.soldOutPulse : ''}`}
      onClick={() => onEdit(product.id)}
      tabIndex={0}
      aria-label={`${product.name}, ${product.price_type === 'custom' ? 'Custom' : formatCurrencyFull(product.price)}, ${product.status}`}
      onKeyDown={(e) => { if (e.key === 'Enter') onEdit(product.id); }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Thumbnail */}
      <div className={styles.rowThumb} aria-hidden="true">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className={styles.rowThumbImg} loading="lazy" />
        ) : (
          <div className={styles.rowThumbPlaceholder}>
            <Package size={20} />
          </div>
        )}
        {st.isCollector && isLowStock && (
          <span className={`${styles.stockBadge} ${styles.low}`}>{product.stock_level}</span>
        )}
        {st.isCollector && isSoldOut && (
          <span className={`${styles.stockBadge} ${styles.out}`}>0</span>
        )}
      </div>

      {/* Body */}
      <div className={styles.rowBody}>
        <div className={styles.rowName}>
          {product.name}
          {dropBadge && <span className={styles.dropBadge}>{dropBadge}</span>}
          {statusFilter === 'stagnant' && !dropBadge && (
            <span className={styles.notStagedText}>NOT STAGED</span>
          )}
        </div>
        <div className={styles.rowMeta}>
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
            </>
          )}
          {st.isVendor && (
            <button
              className={styles.fulfilmentBadge}
              onClick={(e) => onCycleFulfilment(product.id, e)}
            >
              {fulfilmentMap[product.id] || 'Pickup + Delivery'}
            </button>
          )}
          {st.isHost && (
            <>
              <span className={styles.durationBadge}>{product.duration || 60} min · {formatCurrencyFull(product.deposit_amount || 5000)} deposit</span>
              <span className={styles.rowCollection}>{bookingCount} bookings this month</span>
            </>
          )}
          {st.isStudio && (
            <>
              <span className={`${styles.priceTypeBadge} ${product.price_type === 'custom' ? styles.priceTypeBadgeCustom : ''}`}>
                {product.price_type === 'custom' ? 'QUOTE' : `FIXED ${formatCurrencyFull(product.price)}`}
              </span>
              {conversion && (
                <span className={styles.conversionRate}>{conversion.total} enquiries → {conversion.confirmed} confirmed</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Price / Cap */}
      <div className={styles.rowPriceArea}>
        {st.isVendor && (
          <div className={styles.capPill} onClick={(e) => e.stopPropagation()}>
            {inlineEditId === product.id ? (
              <input
                type="number"
                autoFocus
                className={styles.capInput}
                defaultValue={20}
                onBlur={() => onSetInlineEdit(null)}
              />
            ) : (
              <span onClick={() => onSetInlineEdit(product.id)}>20 cap</span>
            )}
          </div>
        )}
        {st.isStudio && product.price_type === 'custom' ? (
          <span className={styles.rowPriceCustom}>Custom</span>
        ) : !st.isVendor && !st.isStudio && (
          <span className={styles.rowPrice}>{formatCurrencyFull(product.price)}</span>
        )}
      </div>

      {/* Actions */}
      <div className={styles.rowActions}>
        {st.isCollector && (
          <div className={styles.stagePopoverWrapper}>
            <m.button
              className={styles.rowActionBtn}
              onClick={(e) => { e.stopPropagation(); onSetStagePopover(product.id === stagePopoverId ? null : product.id); }}
              whileTap={{ scale: 0.93 }}
              aria-label="Stage for drop"
            >
              <Layers size={14} />
            </m.button>
            <AnimatePresence>
              {stagePopoverId === product.id && (
                <m.div
                  className={styles.stageDropPopover}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                >
                  <p className={styles.stageDropTitle}>Stage for Drop</p>
                  {drops.filter(d => d.status === 'scheduled').map(d => {
                    const isStaged = d.product_ids.includes(product.id);
                    return (
                      <div key={d.id} className={styles.stageDropItem} onClick={() => onStage(product.id, d.id)}>
                        <div className={styles.stageDropCheck}>
                          {isStaged && <Check size={10} />}
                        </div>
                        <span>{d.label.split('—')[0]}</span>
                      </div>
                    );
                  })}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {st.isStudio && (
          <m.button
            className={styles.rowActionBtn}
            onClick={(e) => { e.stopPropagation(); onDuplicate(product); }}
            whileTap={{ scale: 0.93 }}
            aria-label="Duplicate package"
          >
            <Copy size={14} />
          </m.button>
        )}
        <m.button
          className={styles.rowActionBtn}
          onClick={(e) => { e.stopPropagation(); onEdit(product.id); }}
          aria-label={`Edit ${product.name}`}
          whileTap={{ scale: 0.93 }}
        >
          <Edit2 size={14} aria-hidden="true" />
        </m.button>
        <m.button
          className={styles.rowActionBtn}
          onClick={(e) => onToggle(product.id, e)}
          aria-label="Toggle status"
          whileTap={{ scale: 0.93 }}
        >
          {product.status === 'live' ? <EyeOff size={14} /> : <Eye size={14} />}
        </m.button>
      </div>
    </m.div>
  );
}

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
  const [searchParams] = useSearchParams();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);

  const {
    statusFilter, setStatusFilter,
    collectionFilter, setCollectionFilter,
    ghostCards, setGhostCards,
    mintProducts, toggleProductStatus, updateProduct,
    addProduct, setProducts,
    lastSoldOutProductId, clearLastSoldOutProduct,
  } = useArchiveStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    if (lastSoldOutProductId) {
      const timer = setTimeout(() => clearLastSoldOutProduct(), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSoldOutProductId, clearLastSoldOutProduct]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [dropsView, setDropsView] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);
  const [claims, setClaims] = useState<ClaimRequest[]>(FIXTURE_CLAIMS);
  const [claimReviewProductId, setClaimReviewProductId] = useState<string | null>(null);

  // Local state for Archive v2
  const [drops, setDrops] = useState<Drop[]>(FIXTURE_DROPS);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedInactive, setExpandedInactive] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [stagePopoverId, setStagePopoverId] = useState<string | null>(null);
  const [fulfilmentMap, setFulfilmentMap] = useState<Record<string, string>>({});

  // Cross-page action shortcuts
  useEffect(() => {
    const action = searchParams.get('action');
    const product = searchParams.get('product');

    if (action === 'stageForDrop' && product) {
      setStagePopoverId(product);
    }
    if (action === 'editCap' && product) {
      setInlineEditId(product);
    }
  }, [searchParams]);

  const rawProducts = useArchiveStore(s => s.products);
  const searchQuery = useArchiveStore(s => s.searchQuery);

  // Filter & Sort Logic
  const products = useMemo(() => {
    let list = [...rawProducts];

    // Status filtering
    if (statusFilter === 'stagnant') {
      const cutoff = Date.now() - 14 * 86400000;
      list = list.filter(p => {
        if (p.status !== 'live') return false;
        return !FIXTURE_RECEIPTS.some(r =>
          new Date(r.created_at).getTime() > cutoff &&
          r.line_items.some(li => li.product_id === p.id)
        );
      });
    } else if (statusFilter === 'in_drop') {
      const activeDrop = drops.find(d => d.merchant_id === merchant.id && d.status !== 'completed');
      list = list.filter(p => activeDrop?.product_ids.includes(p.id));
    } else if (statusFilter === 'active_window') {
      list = list.filter(p => p.status === 'live');
    } else if (statusFilter === 'sold_out_window') {
      list = list.filter(p => p.status === 'sold_out'); // Dummy for now
    } else if (statusFilter !== 'all') {
      list = list.filter(p => p.status === statusFilter);
    }

    // Collection filtering
    if (collectionFilter) {
      list = list.filter(p => p.collection_id === collectionFilter);
    }

    // Search filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.tags && p.tags.some(t => t.toLowerCase().includes(q))));
    }

    // Sorting
    if (st.isHost) {
      list.sort((a, b) => {
        const countA = FIXTURE_BOOKINGS.filter(bk => bk.service_id === a.id).length;
        const countB = FIXTURE_BOOKINGS.filter(bk => bk.service_id === b.id).length;
        return countB - countA;
      });
    }

    return list;
  }, [rawProducts, statusFilter, collectionFilter, searchQuery, st.isHost, drops, merchant.id]);

  const stagnantCount = useMemo(() => {
    const cutoff = Date.now() - 14 * 86400000;
    return rawProducts.filter(p => 
      p.status === 'live' && 
      !FIXTURE_RECEIPTS.some(r => 
        new Date(r.created_at).getTime() > cutoff && 
        r.line_items.some(li => li.product_id === p.id)
      )
    ).length;
  }, [rawProducts]);

  const activeDrop = useMemo(() => 
    drops.find(d => d.merchant_id === merchant.id && d.status !== 'completed')
  , [drops, merchant.id]);

  const inDropCount = activeDrop?.product_ids.length ?? 0;

  // Handlers
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleDuplicatePackage = (pkg: Product) => {
    const newPkg = {
      ...pkg,
      id: `product-pkg-dup-${Date.now()}`,
      name: `Copy of ${pkg.name}`,
      status: 'hidden' as ProductStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    addProduct(newPkg);
    addToast('Package duplicated — edit and make it live when ready', 'success');
  };

  const handleStageProduct = (productId: string, dropId: string) => {
    setDrops(prev => prev.map(d => {
      if (d.id === dropId) {
        const isStaged = d.product_ids.includes(productId);
        const nextIds = isStaged 
          ? d.product_ids.filter(id => id !== productId)
          : [...d.product_ids, productId];
        
        if (!isStaged) addToast(`Added to ${d.label.split('—')[0]}`, 'success');
        else addToast(`Removed from ${d.label.split('—')[0]}`, 'info');
        
        return { ...d, product_ids: nextIds };
      }
      return d;
    }));
    setStagePopoverId(null);
  };

  const handleCopyMenu = () => {
    addToast('Menu copied — edit any items before opening the window', 'success');
  };

  // Load correct fixture products for active store type
  useEffect(() => {
    switch (merchant.store_type) {
      case 'vendor':          setProducts(FIXTURE_VENDOR_PRODUCTS); break;
      case 'host':            setProducts(FIXTURE_HOST_PRODUCTS); break;
      case 'studio':          setProducts(FIXTURE_STUDIO_PRODUCTS); break;
      case 'digital_creator': break;
      default:                setProducts(FIXTURE_PRODUCTS); break;
    }
  }, [merchant.store_type, setProducts]);

  // Redirect Digital Creator to /catalogue
  useEffect(() => {
    if (st.isDigital) navigate('/catalogue', { replace: true });
  }, [st.isDigital, navigate]);

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
          category: p.category ?? (p.tags?.[0] || ''),
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
  }, [editTarget, drawerOpen, setGhostCards]);

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
    const newProduct: Product = {
      id: `product-new-${Date.now()}`,
      merchant_id: merchant.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      product_type: productType,
      stock_level: st.isCollector ? (parseInt(form.stock) || 0) : null,
      collection_id: null,
      category: form.category.trim() || null,
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
      category: form.category.trim() || null,
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

  // ── Handlers passed down to ProductRow ─────────────────────────────────────

  const cycleFulfilment = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = fulfilmentMap[productId] || 'Pickup + Delivery';
    const options = ['Pickup + Delivery', 'Pickup only', 'Delivery only'];
    const next = options[(options.indexOf(current) + 1) % options.length];
    setFulfilmentMap(prev => ({ ...prev, [productId]: next }));
    addToast(`Fulfilment: ${next}`, 'info');
  };

  // ── Status tab config ───────────────────────────────────────────────────────
  type TabValue = ProductStatus | 'all' | 'stagnant' | 'in_drop' | 'active_window' | 'sold_out_window';

  const statusTabs: { value: TabValue; label: string }[] = useMemo(() => {
    if (st.isCollector) return [
      { value: 'all', label: 'All' },
      { value: 'live', label: 'Live' },
      { value: 'in_drop', label: `In This Drop (${inDropCount})` },
      { value: 'stagnant', label: `Stagnant (${stagnantCount})` },
      { value: 'hidden', label: 'Hidden' },
      { value: 'sold_out', label: 'Sold Out' },
    ];
    if (st.isVendor) return [
      { value: 'all', label: 'All' },
      { value: 'active_window', label: 'Active in Window' },
      { value: 'sold_out_window', label: 'Sold Out This Window' },
    ];
    return [
      { value: 'all', label: 'All' },
      { value: 'live', label: 'Active' },
      { value: 'hidden', label: st.isHost || st.isStudio ? 'Inactive' : 'Hidden' },
    ];
  }, [st, inDropCount, stagnantCount]);

  // ── Drawer content ──
  const drawerTitle = editTarget
    ? `Edit ${st.itemLabel}`
    : st.isCollector ? `Mint ${st.itemLabel}` : `Add ${st.itemLabel}`;

  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading (Phase 3C)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className="skeleton skeleton-text" style={{ width: '80px', height: '10px' }} />
          <div className="skeleton skeleton-text" style={{ width: '150px', height: '24px', marginTop: '8px' }} />
        </div>
        <div className={styles.filterBar}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ width: '80px', height: '32px', borderRadius: 'var(--r-pill)' }} />
          ))}
        </div>
        <div className={styles.productList}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={styles.productRow}>
              <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: 'var(--r-sm)' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', height: '10px' }} />
              </div>
              <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: 'var(--r-pill)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{st.isVendor ? 'The Menu' : st.archiveLabel}</h1>
          <span className={styles.itemCount}>
            {products.length} {products.length === 1 ? st.itemLabel : st.itemsLabel}
          </span>
        </div>
        <div className={styles.headerActions}>
          {st.isVendor && (
            <button className={styles.rowActionBtn} style={{ width: 'auto', padding: '0 12px', gap: 8 }} onClick={handleCopyMenu}>
              <Copy size={14} />
              Copy last window →
            </button>
          )}
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

      {/* Stagnant Header */}
      {statusFilter === 'stagnant' && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--color-fg-muted)' }}>
            <strong>{products.length} items</strong> — No sales in 14+ days.
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-fg-ghost)' }}>(consider featuring in next drop or reviewing price)</p>
        </div>
      )}

      {/* Product list */}
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
                ? 'Nothing matches. Try a different filter or add new pieces.'
                : `Add your first ${st.itemLabel.toLowerCase()} to get started.`}
            </p>
            <div className={styles.emptyActions}>
              <button 
                className={styles.emptyCta}
                onClick={() => { setEditTarget(null); setDrawerOpen(true); }}
              >
                {st.isCollector ? 'Mint New Asset' : `Add ${st.itemLabel}`}
              </button>
              {st.isCollector && (
                <button 
                  className={styles.emptyCtaSecondary}
                  onClick={() => { setEditTarget(null); setDrawerOpen(true); }}
                >
                  Import from WhatsApp
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.productList} role="list">
            <AnimatePresence initial={false}>
              {(() => {
                const rowProps = {
                  merchantId: merchant.id,
                  drops,
                  fulfilmentMap,
                  statusFilter,
                  stagePopoverId,
                  inlineEditId,
                  isSoldOutPulse: false, // Placeholder, will be overriden per row
                  onEdit: (id: string) => { setEditTarget(id); setDrawerOpen(true); },
                  onToggle: handleToggle,
                  onStage: handleStageProduct,
                  onDuplicate: handleDuplicatePackage,
                  onCycleFulfilment: cycleFulfilment,
                  onSetStagePopover: setStagePopoverId,
                  onSetInlineEdit: setInlineEditId,
                };

                // Specialized Renderers
                if (st.isVendor) {
                  const categories = Array.from(new Set(products.map(p => p.category || 'General')));
                  return categories.map(cat => {
                    const catItems = products.filter(p => (p.category || 'General') === cat);
                    const isExpanded = expandedCategories.has(cat);
                    return (
                      <div key={cat} className={styles.categoryGroup}>
                        <div className={styles.categoryGroupHeader} onClick={() => toggleCategory(cat)}>
                          <div className={styles.categoryGroupHeaderInner}>
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <h3 className={styles.categoryTitle}>{cat} ({catItems.length})</h3>
                          </div>
                        </div>
                        {isExpanded && catItems.map((product, i) => (
                          <ProductRow key={product.id} product={product} index={i} {...rowProps} isSoldOutPulse={product.id === lastSoldOutProductId} />
                        ))}
                      </div>
                    );
                  });
                }

                if (st.isHost) {
                  const activeItems = products.filter(p => p.status !== 'hidden');
                  const inactiveItems = products.filter(p => p.status === 'hidden');
                  return (
                    <>
                      {activeItems.map((product, i) => (
                        <ProductRow key={product.id} product={product} index={i} {...rowProps} isSoldOutPulse={product.id === lastSoldOutProductId} />
                      ))}
                      {inactiveItems.length > 0 && (
                        <div className={styles.inactiveSection}>
                          <div className={styles.inactiveHeader} onClick={() => setExpandedInactive(!expandedInactive)}>
                            <span>Inactive Services ({inactiveItems.length})</span>
                            {expandedInactive ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          {expandedInactive && inactiveItems.map((product, i) => (
                            <ProductRow key={product.id} product={product} index={i} {...rowProps} isSoldOutPulse={product.id === lastSoldOutProductId} />
                          ))}
                        </div>
                      )}
                    </>
                  );
                }

                if (st.isStudio) {
                  const packages = products.filter(p => p.product_type === 'package');
                  return (
                    <>
                      <div className={styles.packagesSection}>
                        <h2 className={styles.sectionHeading}>Packages</h2>
                        {packages.map((product, i) => (
                          <ProductRow key={product.id} product={product} index={i} {...rowProps} isSoldOutPulse={product.id === lastSoldOutProductId} />
                        ))}
                      </div>
                      <div className={styles.enquiryFormsSection}>
                        <h2 className={styles.sectionHeading}>Enquiry Forms</h2>
                        {packages.map(pkg => (
                          <div key={`form-${pkg.id}`} className={styles.enquiryFormCard}>
                            <div>
                              <p className={styles.enquiryFormName}>Form: {pkg.name}</p>
                              <p className={styles.enquiryFormMeta}>6 fields configured</p>
                            </div>
                            <button className={styles.formEditBtn} onClick={() => addToast('Form editing coming in a later update.', 'info')}>Edit Form</button>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                }

                // Default / Collector
                return products.map((product, i) => (
                  <ProductRow key={product.id} product={product} index={i} {...rowProps} isSoldOutPulse={product.id === lastSoldOutProductId} />
                ));
              })()}
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
