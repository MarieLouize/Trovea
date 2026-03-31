import { useState, useEffect } from 'react';
import { Plus, Package, Edit2, Eye, EyeOff, Download } from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { ProductStatus } from '@/lib/types';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { FIXTURE_DIGITAL_PRODUCTS } from '@/lib/fixtures';
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

// ─── Status tabs ─────────────────────────────────────────────────────────────

const CATALOGUE_TABS: { value: ProductStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const merchant = useMerchantStore((s) => s.merchant);

  const {
    statusFilter, setStatusFilter,
    filteredProducts, toggleProductStatus,
    updateProduct, addProduct, setProducts,
  } = useArchiveStore();
  const { addToast } = useUIStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [form, setForm] = useState<FormDraft>(EMPTY_FORM);

  const products = filteredProducts();

  // Always load digital products
  useEffect(() => {
    setProducts(FIXTURE_DIGITAL_PRODUCTS);
  }, []);

  // Populate form when editing / reset when adding
  useEffect(() => {
    if (!drawerOpen) return;
    if (editTarget) {
      const p = useArchiveStore.getState().products.find((x) => x.id === editTarget);
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
  }, [editTarget, drawerOpen]);

  // ── Handlers ──
  const openAdd = () => {
    setEditTarget(null);
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

  const canSubmit = form.name.trim().length > 0 && (form.isFree || parseFloat(form.price) > 0);

  const handleAdd = () => {
    if (!canSubmit) return;
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
      created_at: now,
      updated_at: now,
    });
    addToast('Product added to catalogue.', 'success');
    setDrawerOpen(false);
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

  const drawerTitle = editTarget ? 'Edit Product' : 'Add Product';

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Catalogue</h1>
          <span className={styles.itemCount}>{products.length} product{products.length !== 1 ? 's' : ''}</span>
        </div>
        <m.button
          className={styles.addBtn}
          onClick={openAdd}
          aria-label="Add new product"
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={14} aria-hidden="true" />
          + Product
        </m.button>
      </div>

      {/* Status tabs */}
      <div className={styles.statusTabs} role="tablist" aria-label="Filter by status">
        {CATALOGUE_TABS.map((tab) => (
          <m.button
            key={tab.value}
            className={`${styles.statusTab} ${statusFilter === tab.value ? styles.active : ''}`}
            onClick={() => setStatusFilter(tab.value)}
            role="tab"
            aria-selected={statusFilter === tab.value}
            aria-label={`Show ${tab.label} products`}
            whileTap={{ scale: 0.96 }}
          >
            {tab.label}
          </m.button>
        ))}
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <div className={styles.emptyIcon} aria-hidden="true">
            <Package size={28} />
          </div>
          <h2 className={styles.emptyTitle}>Your catalogue is empty.</h2>
          <p className={styles.emptyText}>Add your first digital product to start selling.</p>
          <m.button className={styles.emptyAddBtn} onClick={openAdd} aria-label="Add first product" whileTap={{ scale: 0.97 }}>
            <Plus size={14} aria-hidden="true" />
            Add Product
          </m.button>
        </div>
      ) : (
        <div className={styles.productList} role="list">
          <AnimatePresence initial={false}>
            {products.map((product, i) => {
              const deliveryMethod = product.delivery_url ? 'DOWNLOAD' : 'MANUAL';
              return (
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
                  aria-label={`${product.name}, ${product.is_free ? 'Free' : formatCurrencyFull(product.price)}`}
                  onKeyDown={(e) => { if (e.key === 'Enter') openEdit(product.id, e as unknown as React.MouseEvent); }}
                  whileTap={{ scale: 0.995 }}
                >
                  {/* Thumbnail */}
                  <div className={styles.rowThumb} aria-hidden="true">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className={styles.rowThumbImg} loading="lazy" />
                    ) : (
                      <div className={styles.rowThumbPlaceholder}>
                        <Download size={18} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className={styles.rowBody}>
                    <div className={styles.rowName}>{product.name}</div>
                    <div className={styles.rowMeta}>
                      {product.early_access_price != null && (
                        <span className={styles.earlyBadge}>EARLY ACCESS · {formatCurrencyFull(product.early_access_price)}</span>
                      )}
                      <span className={styles.deliveryBadge}>{deliveryMethod}</span>
                    </div>
                  </div>

                  {/* Price */}
                  {product.is_free ? (
                    <span className={styles.rowPriceFree}>Free</span>
                  ) : (
                    <span className={styles.rowPrice}>{formatCurrencyFull(product.price)}</span>
                  )}

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
                      aria-label={product.status === 'live' ? 'Unpublish product' : 'Publish product'}
                      whileTap={{ scale: 0.93 }}
                    >
                      {product.status === 'live'
                        ? <EyeOff size={14} aria-hidden="true" />
                        : <Eye size={14} aria-hidden="true" />}
                    </m.button>
                  </div>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Drawer */}
      <BaseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="bottom"
        title={drawerTitle}
      >
        <div className={styles.drawerForm}>
          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel} htmlFor="cat-name">Product Name</label>
            <input
              id="cat-name"
              className={styles.drawerInput}
              type="text"
              placeholder="Brand Starter Kit"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              aria-label="Product name"
            />
          </div>

          <div className={styles.drawerRow}>
            <div className={styles.drawerSection}>
              <label className={styles.drawerLabel} htmlFor="cat-price">
                Price (₦)
                {form.isFree && <span className={styles.drawerLabelMuted}> — disabled</span>}
              </label>
              <input
                id="cat-price"
                className={`${styles.drawerInput} ${form.isFree ? styles.drawerInputDisabled : ''}`}
                type="number"
                placeholder="12000"
                value={form.isFree ? '' : form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                disabled={form.isFree}
                min={0}
                aria-label="Price"
              />
            </div>
            <div className={styles.drawerSection}>
              <span className={styles.drawerLabel}>Free Product</span>
              <div
                className={styles.toggleRow}
                onClick={() => setForm((f) => ({ ...f, isFree: !f.isFree, price: '' }))}
                role="switch"
                aria-checked={form.isFree}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setForm((f) => ({ ...f, isFree: !f.isFree, price: '' })); }}
              >
                <span className={styles.toggleSmallLabel}>Free</span>
                <div className={`${styles.toggleControl} ${form.isFree ? styles.toggleOn : ''}`} aria-hidden="true">
                  <div className={styles.toggleThumb} />
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {!form.isFree && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.drawerRow}
              >
                <div className={styles.drawerSection}>
                  <label className={styles.drawerLabel} htmlFor="cat-ea-price">
                    Early Access Price <span className={styles.drawerLabelMuted}>(opt)</span>
                  </label>
                  <input
                    id="cat-ea-price"
                    className={styles.drawerInput}
                    type="number"
                    placeholder="8000"
                    value={form.earlyAccessPrice}
                    onChange={(e) => setForm((f) => ({ ...f, earlyAccessPrice: e.target.value }))}
                    min={0}
                    aria-label="Early access price"
                  />
                </div>
                {form.earlyAccessPrice && (
                  <div className={styles.drawerSection}>
                    <label className={styles.drawerLabel} htmlFor="cat-ea-cap">
                      Cap <span className={styles.drawerLabelMuted}>(qty)</span>
                    </label>
                    <input
                      id="cat-ea-cap"
                      className={styles.drawerInput}
                      type="number"
                      placeholder="20"
                      value={form.earlyAccessCap}
                      onChange={(e) => setForm((f) => ({ ...f, earlyAccessCap: e.target.value }))}
                      min={1}
                      aria-label="Early access cap"
                    />
                  </div>
                )}
              </m.div>
            )}
          </AnimatePresence>

          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel} htmlFor="cat-url">
              Delivery URL <span className={styles.drawerLabelMuted}>(optional)</span>
            </label>
            <input
              id="cat-url"
              className={styles.drawerInput}
              type="url"
              placeholder="https://drive.google.com/..."
              value={form.deliveryUrl}
              onChange={(e) => setForm((f) => ({ ...f, deliveryUrl: e.target.value }))}
              aria-label="Delivery URL"
            />
          </div>

          <div className={styles.drawerSection}>
            <label className={styles.drawerLabel} htmlFor="cat-desc">
              Description <span className={styles.drawerLabelMuted}>(optional)</span>
            </label>
            <textarea
              id="cat-desc"
              className={styles.drawerTextarea}
              placeholder="e.g. Includes logo files, brand guide PDF, and 3 Instagram templates."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              aria-label="Product description"
            />
          </div>

          <p className={styles.imagePlaceholder}>Preview image upload — coming soon.</p>

          <m.button
            className={styles.submitBtn}
            onClick={editTarget ? handleSave : handleAdd}
            disabled={!canSubmit}
            aria-label={editTarget ? 'Save changes' : 'Add to catalogue'}
            whileTap={canSubmit ? { scale: 0.98 } : {}}
          >
            {editTarget ? 'Save Changes' : 'Add to Catalogue'}
          </m.button>
        </div>
      </BaseDrawer>
    </div>
  );
}
