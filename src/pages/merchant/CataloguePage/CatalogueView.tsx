import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Eye, EyeOff, Download, Link as LinkIcon, AlertTriangle, Check, Loader } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { FIXTURE_DIGITAL_PRODUCTS, FIXTURE_RECEIPTS } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import styles from './CataloguePage.module.css';

// ─── Form state ─────────────────────────────────────────────────────────────

interface FormDraft {
  name: string;
  price: string;
  isFree: boolean;
  earlyAccessPrice: string;
  earlyAccessCap: string;
  deliveryUrl: string;
  description: string;
}

const EMPTY_FORM: FormDraft = {
  name: '',
  price: '',
  isFree: false,
  earlyAccessPrice: '',
  earlyAccessCap: '',
  deliveryUrl: '',
  description: '',
};

// ─── Types ──────────────────────────────────────────────────────────────────

type LinkStatus = 'idle' | 'checking' | 'ok' | 'broken' | 'none';

// ─── Component ───────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const merchant = useMerchantStore((s) => s.merchant);
  const [searchParams] = useSearchParams();

  const type = merchant?.store_type || 'collector';
  const st = {
    isCollector: type === 'collector',
    isVendor:    type === 'vendor',
    isHost:      type === 'host',
    isDigital:   type === 'digital_creator',
    isStudio:    type === 'studio',
  };

  // Derive products with new filters
  const rawProducts = useArchiveStore(s => s.products);
  const searchQuery = useArchiveStore(s => s.searchQuery);

  const {
    statusFilter, setStatusFilter,
    updateProduct, addProduct, setProducts,
    toggleProductStatus,
    lastSoldOutProductId, clearLastSoldOutProduct,
  } = useArchiveStore();
  const { addToast } = useUIStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);
  const [linkStatuses, setLinkStatuses] = useState<Record<string, LinkStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading (Phase 3C)
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Sold out listener
  useEffect(() => {
    if (lastSoldOutProductId) {
      const p = rawProducts.find(x => x.id === lastSoldOutProductId);
      if (p) {
        addToast(`Sold out! ${p.name} is gone.`, 'info');
      }
      clearLastSoldOutProduct();
    }
  }, [lastSoldOutProductId, rawProducts, addToast, clearLastSoldOutProduct]);

  // Cross-page action shortcuts
  useEffect(() => {
    const action = searchParams.get('action');
    const product = searchParams.get('product');
    if (action === 'addPreview' && product) {
      setEditTarget(product);
      setDrawerOpen(true);
    }
    if (action === 'checkLink' && product) {
      const p = rawProducts.find(x => x.id === product);
      if (p) checkLink(product, p.delivery_url);
    }
  }, [searchParams, rawProducts]);

  const products = useMemo(() => {
    let list = [...rawProducts];

    if (statusFilter === 'no_preview') {
      list = list.filter(p => p.images.length === 0);
    } else if (statusFilter === 'zero_downloads') {
      list = list.filter(p => !FIXTURE_RECEIPTS.some(r => r.line_items.some(li => li.product_id === p.id)));
    } else if (statusFilter !== 'all' && (statusFilter === 'live' || statusFilter === 'hidden')) {
      list = list.filter(p => p.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }

    return list;
  }, [rawProducts, statusFilter, searchQuery]);

  // Always load digital products
  useEffect(() => {
    setProducts(FIXTURE_DIGITAL_PRODUCTS);
  }, [setProducts]);

  // Populate form
  useEffect(() => {
    if (!drawerOpen) return;
    if (editTarget) {
      const p = rawProducts.find((x) => x.id === editTarget);
      if (p) {
        setForm({
          name: p.name,
          price: String(p.price),
          isFree: p.is_free,
          earlyAccessPrice: p.early_access_price != null ? String(p.early_access_price) : '',
          earlyAccessCap: p.early_access_cap != null ? String(p.early_access_cap) : '',
          deliveryUrl: p.delivery_url ?? '',
          description: p.description ?? '',
        });
      }
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editTarget, drawerOpen, rawProducts]);

  // ── Handlers ──
  const checkLink = async (productId: string, url: string | null) => {
    setLinkStatuses(prev => ({ ...prev, [productId]: 'checking' }));
    await new Promise(r => setTimeout(r, 900));
    try {
      if (!url) { setLinkStatuses(prev => ({ ...prev, [productId]: 'none' })); return; }
      new URL(url);
      setLinkStatuses(prev => ({ ...prev, [productId]: 'ok' }));
    } catch {
      setLinkStatuses(prev => ({ ...prev, [productId]: 'broken' }));
    }
  };

  const handleSave = () => {
    if (!editTarget || !form.name.trim()) return;
    updateProduct(editTarget, {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.isFree ? 0 : (parseFloat(form.price) || 0),
      is_free: form.isFree,
      early_access_price: form.earlyAccessPrice ? parseFloat(form.earlyAccessPrice) : null,
      early_access_cap: form.earlyAccessCap ? parseInt(form.earlyAccessCap) : null,
      delivery_url: form.deliveryUrl.trim() || null,
    });
    addToast('Product updated.', 'success');
    setDrawerOpen(false);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    addProduct({
      id: `product-new-${Date.now()}`,
      merchant_id: merchant.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.isFree ? 0 : (parseFloat(form.price) || 0),
      product_type: 'digital',
      stock_level: null,
      collection_id: null,
      category: null,
      tags: [],
      status: 'live',
      images: [],
      has_variants: false,
      variant_axis: null,
      variants: null,
      claim_mode: false,
      claim_limit: null,
      duration: null,
      deposit_amount: null,
      deposit_required: false,
      delivery_url: form.deliveryUrl.trim() || null,
      is_free: form.isFree,
      early_access_price: form.earlyAccessPrice ? parseFloat(form.earlyAccessPrice) : null,
      early_access_cap: form.earlyAccessCap ? parseInt(form.earlyAccessCap) : null,
      price_type: null,
      scope_description: null,
      deliverables: null,
      timeline_estimate: null,
      deposit_pct: null,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    addToast('Product added.', 'success');
    setDrawerOpen(false);
  };

  const CATALOGUE_TABS = [
    { value: 'all', label: 'All' },
    { value: 'no_preview', label: 'No Preview' },
    { value: 'zero_downloads', label: 'Zero Downloads' },
  ];

  const pageTitle = 
    st.isHost    ? 'Services'  :
    st.isVendor  ? 'Menu'      :
    st.isStudio  ? 'Packages'  :
    st.isDigital ? 'Tools'     :
    'Catalogue';

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.pageHeader}>
          <div>
            <div className="skeleton-text" style={{ width: '100px', height: '28px', marginBottom: '8px' }} />
            <div className="skeleton-text" style={{ width: '60px', height: '12px' }} />
          </div>
          <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: 'var(--r-md)' }} />
        </div>
        <div className={styles.statusTabs}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ width: '80px', height: '32px', borderRadius: 'var(--r-pill)' }} />
          ))}
        </div>
        <div className={styles.productList}>
          {[1,2,3,4].map(i => (
            <div key={i} className={styles.productRow} style={{ padding: '16px' }}>
              <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: 'var(--r-sm)', marginRight: '12px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-text" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton-text" style={{ width: '20%', height: '12px' }} />
              </div>
              <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: 'var(--r-sm)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          <span className={styles.itemCount}>{products.length} {products.length === 1 ? (st.isHost ? 'service' : 'item') : (st.isHost ? 'services' : 'items')}</span>
        </div>
        <m.button
          className={styles.addBtn}
          onClick={() => { setEditTarget(null); setDrawerOpen(true); }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={14} /> + {st.isHost ? 'Service' : 'Item'}
        </m.button>
      </div>

      <div className={styles.statusTabs}>
        {CATALOGUE_TABS.map((tab) => (
          <m.button
            key={tab.value}
            className={`${styles.statusTab} ${statusFilter === tab.value ? styles.active : ''}`}
            onClick={() => setStatusFilter(tab.value as Parameters<typeof setStatusFilter>[0])}
            whileTap={{ scale: 0.96 }}
          >
            {tab.label}
          </m.button>
        ))}
      </div>

      <div className={styles.productList}>
        {products.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>—</span>
            <h2 className={styles.emptyTitle}>Nothing found.</h2>
            <p className={styles.emptyText}>Adjust your filters or add your first {st.isHost ? 'service' : 'item'}.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {products.map((product, i) => {
            const linkStatus = linkStatuses[product.id] || 'idle';
            const downloadCount = FIXTURE_RECEIPTS.filter(r => r.line_items.some(li => li.product_id === product.id)).length;
            
            // Launch state
            let launchLabel = 'LIVE';
            if (product.status === 'hidden' && product.early_access_cap) launchLabel = 'EARLY ACCESS';
            else if (product.status === 'live' && product.early_access_cap) launchLabel = `EARLY ACCESS · ${downloadCount}/${product.early_access_cap} sold`;
            else if (product.status === 'hidden') launchLabel = 'HIDDEN';
            else if (product.status === 'sold_out') launchLabel = 'SOLD OUT';

            return (
              <m.div
                key={product.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className={styles.productRow}
                onClick={() => { setEditTarget(product.id); setDrawerOpen(true); }}
              >
                <div className={styles.rowThumb}>
                  {product.images[0] ? (
                    <img src={product.images[0]} alt="" className={styles.productThumbnail} />
                  ) : (
                    <div className={styles.productThumbnailPlaceholder}><Download size={16} /></div>
                  )}
                </div>

                <div className={styles.rowBody}>
                  <div className={styles.rowName}>
                    {product.name}
                    <span className={styles.launchBadge}>{launchLabel}</span>
                  </div>
                  <div className={styles.rowMeta}>
                    {downloadCount} downloads · {product.is_free ? 'Free' : formatCurrencyFull(product.price)}
                  </div>
                </div>

                <div className={styles.rowActions}>
                  <button
                    className={`${styles.linkCheckBtn} ${styles[`link_${linkStatus}`]}`}
                    onClick={(e) => { e.stopPropagation(); checkLink(product.id, product.delivery_url); }}
                    disabled={linkStatus === 'checking'}
                  >
                    {linkStatus === 'idle' && <><LinkIcon size={12} /> Check Link</>}
                    {linkStatus === 'checking' && <Loader size={12} className={styles.spinner} />}
                    {linkStatus === 'ok' && <><Check size={12} /> Link OK</>}
                    {linkStatus === 'broken' && <><AlertTriangle size={12} /> Broken</>}
                    {linkStatus === 'none' && 'No link set'}
                  </button>
                  <m.button
                    className={styles.rowActionBtn}
                    onClick={(e) => { e.stopPropagation(); toggleProductStatus(product.id); }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {product.status === 'live' ? <EyeOff size={14} /> : <Eye size={14} />}
                  </m.button>
                  <m.button
                    className={styles.rowActionBtn}
                    onClick={() => { setEditTarget(product.id); setDrawerOpen(true); }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Edit2 size={14} />
                  </m.button>
                </div>
              </m.div>
            );
          })}
        </AnimatePresence>
      )}
      </div>

      <BaseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editTarget ? 'Edit Product' : 'Add Product'}>
        <div className={styles.drawerForm}>
          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel}>Product Name</label>
            <input className={styles.drawerInput} type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className={styles.drawerRow}>
            <div className={styles.drawerSection} style={{ flex: 2 }}>
              <label className={styles.drawerLabel}>Price (₦)</label>
              <input className={styles.drawerInput} type="number" disabled={form.isFree} value={form.isFree ? '' : form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
            <div className={styles.drawerSection} style={{ flex: 1 }}>
              <label className={styles.drawerLabel}>Free?</label>
              <div className={styles.toggleRow} onClick={() => setForm({...form, isFree: !form.isFree})}>
                <div className={`${styles.toggleControl} ${form.isFree ? styles.toggleOn : ''}`}><div className={styles.toggleThumb} /></div>
              </div>
            </div>
          </div>
          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel}>Delivery URL (Google Drive, etc.)</label>
            <input className={styles.drawerInput} type="url" value={form.deliveryUrl} onChange={e => setForm({...form, deliveryUrl: e.target.value})} />
          </div>
          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel}>Description</label>
            <textarea className={styles.drawerTextarea} rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <button className={styles.submitBtn} onClick={editTarget ? handleSave : handleAdd}>
            {editTarget ? 'Save Changes' : 'Add to Catalogue'}
          </button>
        </div>
      </BaseDrawer>
    </div>
  );
}
