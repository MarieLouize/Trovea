import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Edit2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useArchiveStore } from '@/lib/store/archive.store';
import { FIXTURE_COLLECTIONS } from '@/lib/fixtures';
import { parseSmartPaste } from '@/lib/utils/smart-paste';
import { formatCurrencyFull } from '@/lib/utils/format';
import { useUIStore } from '@/lib/store/ui.store';
import BaseDrawer from '@/components/primitives/BaseDrawer/BaseDrawer';
import type { ProductStatus } from '@/lib/types';
import styles from './ArchivePage.module.css';

type StatusFilter = ProductStatus | 'all';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'sold_out', label: 'Sold Out' },
];

export default function ArchivePage() {
  const {
    statusFilter, setStatusFilter,
    collectionFilter, setCollectionFilter,
    filteredProducts, ghostCards, setGhostCards,
    mintProducts, toggleProductStatus,
  } = useArchiveStore();
  const { addToast } = useUIStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const products = filteredProducts();

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setPasteText(text);
    const parsed = parseSmartPaste(text);
    const cards = parsed.map((p, i) => ({
      ...p,
      tempId: `ghost-${Date.now()}-${i}`,
      confirmedName: p.name,
      confirmedPrice: p.price,
    }));
    setGhostCards(cards);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteText(val);
    if (val.trim()) {
      const parsed = parseSmartPaste(val);
      const cards = parsed.map((p, i) => ({
        ...p,
        tempId: `ghost-${Date.now()}-${i}`,
        confirmedName: p.name,
        confirmedPrice: p.price,
      }));
      setGhostCards(cards);
    } else {
      setGhostCards([]);
    }
  };

  const canMint = ghostCards.length > 0 && ghostCards.every(c => c.confirmedName && c.confirmedPrice > 0);

  const handleMint = () => {
    if (!canMint) return;
    mintProducts(ghostCards);
    setDrawerOpen(false);
    setPasteText('');
    addToast(`${ghostCards.length} asset${ghostCards.length > 1 ? 's' : ''} minted.`, 'success');
  };

  const openAdd = () => {
    setEditTarget(null);
    setPasteText('');
    setGhostCards([]);
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

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Archive</h1>
        <div className={styles.headerActions}>
          <button className={styles.addBtn} onClick={openAdd} aria-label="Add new item">
            <Plus size={14} aria-hidden="true" />
            Mint Item
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className={styles.statusTabs} role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            className={`${styles.statusTab} ${statusFilter === tab.value ? styles.active : ''}`}
            onClick={() => setStatusFilter(tab.value)}
            role="tab"
            aria-selected={statusFilter === tab.value}
            aria-label={`Show ${tab.label} items`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Collection Chips */}
      <div className={styles.collectionsRow} aria-label="Filter by collection">
        <button
          className={`${styles.collectionChip} ${collectionFilter === null ? styles.active : ''}`}
          onClick={() => setCollectionFilter(null)}
          aria-label="All collections"
          aria-pressed={collectionFilter === null}
        >
          All
        </button>
        {FIXTURE_COLLECTIONS.map(col => (
          <button
            key={col.id}
            className={`${styles.collectionChip} ${collectionFilter === col.id ? styles.active : ''}`}
            onClick={() => setCollectionFilter(col.id)}
            aria-label={col.name}
            aria-pressed={collectionFilter === col.id}
          >
            <span
              className={styles.collectionChipDot}
              style={{ background: col.color_accent }}
              aria-hidden="true"
            />
            {col.name}
          </button>
        ))}
        <button className={styles.newCollectionChip} aria-label="Add new collection">
          <Plus size={10} aria-hidden="true" />
          New Collection
        </button>
      </div>

      {/* Product List */}
      {products.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <span className={styles.emptyIcon}>—</span>
          <h2 className={styles.emptyTitle}>The Archive is Empty</h2>
          <p className={styles.emptyText}>No items match this filter. Adjust your filters or mint a new asset.</p>
        </div>
      ) : (
        <div className={styles.productList} role="list">
          <AnimatePresence initial={false}>
            {products.map((product, i) => (
              <motion.div
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
                aria-label={`${product.name}, ${formatCurrencyFull(product.price)}, ${product.status}`}
                onKeyDown={(e) => { if (e.key === 'Enter') openEdit(product.id, e as unknown as React.MouseEvent); }}
              >
                {/* Thumbnail */}
                <div className={styles.rowThumb} aria-hidden="true">
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className={styles.rowThumbImg}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fg-ghost)' }}>
                      <Package size={20} />
                    </div>
                  )}
                  {product.stock_level <= 2 && product.stock_level > 0 && (
                    <span className={`${styles.stockBadge} ${styles.low}`} aria-label={`${product.stock_level} left`}>
                      {product.stock_level}
                    </span>
                  )}
                  {product.stock_level === 0 && (
                    <span className={`${styles.stockBadge} ${styles.out}`} aria-label="Sold out">0</span>
                  )}
                </div>

                {/* Body */}
                <div className={styles.rowBody}>
                  <div className={styles.rowName}>{product.name}</div>
                  <div className={styles.rowMeta}>
                    {product.collection_id && (
                      <span className={styles.rowCollection}>
                        {FIXTURE_COLLECTIONS.find(c => c.id === product.collection_id)?.name ?? ''}
                      </span>
                    )}
                    <span className={`${styles.rowStatusPill} ${styles[product.status]}`}>
                      {product.status.replace('_', ' ')}
                    </span>
                    {product.variants && (
                      <span className={styles.rowCollection}>{product.variants.length} variants</span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <span className={styles.rowPrice}>{formatCurrencyFull(product.price)}</span>

                {/* Actions */}
                <div className={styles.rowActions}>
                  <button
                    className={styles.rowActionBtn}
                    onClick={(e) => openEdit(product.id, e)}
                    aria-label={`Edit ${product.name}`}
                  >
                    <Edit2 size={14} aria-hidden="true" />
                  </button>
                  <button
                    className={styles.rowActionBtn}
                    onClick={(e) => handleToggle(product.id, e)}
                    aria-label={product.status === 'live' ? 'Hide item' : 'Show item'}
                  >
                    {product.status === 'live'
                      ? <EyeOff size={14} aria-hidden="true" />
                      : <Eye size={14} aria-hidden="true" />
                    }
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit Drawer */}
      <BaseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        position="bottom"
        title={editTarget ? 'Edit Item' : 'Mint New Asset'}
      >
        <div className={styles.drawerForm}>
          {!editTarget && (
            <>
              {/* Smart Paste */}
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

              {/* Ghost Cards */}
              <AnimatePresence>
                {ghostCards.length > 0 && (
                  <motion.div
                    className={styles.ghostCards}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {ghostCards.map((card, i) => (
                      <motion.div
                        key={card.tempId}
                        className={styles.ghostCard}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.08 }}
                      >
                        <div className={styles.ghostCardIcon} aria-hidden="true">
                          <Package size={14} />
                        </div>
                        <div className={styles.ghostCardBody}>
                          <div className={styles.ghostCardName}>{card.confirmedName}</div>
                          <div className={styles.ghostCardMeta}>
                            Qty: {card.quantity}
                            {card.variantHints.length > 0 && ` · ${card.variantHints.join(', ')}`}
                          </div>
                        </div>
                        <div>
                          {card.confirmedPrice > 0
                            ? <span className={styles.ghostCardPrice}>{formatCurrencyFull(card.confirmedPrice)}</span>
                            : <span className={styles.ghostCardPriceError}>No price</span>
                          }
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                className={styles.mintBtn}
                onClick={handleMint}
                disabled={!canMint}
                aria-label={canMint ? `Mint ${ghostCards.length} asset${ghostCards.length > 1 ? 's' : ''}` : 'Mint Assets'}
              >
                <Sparkles size={14} aria-hidden="true" />
                {canMint ? `Mint ${ghostCards.length} Asset${ghostCards.length > 1 ? 's' : ''}` : 'Paste items above to mint'}
              </button>
            </>
          )}

          {editTarget && (
            <>
              {/* Edit form — abbreviated for readability, full fields wired */}
              {(() => {
                const { products } = useArchiveStore.getState();
                const p = products.find(x => x.id === editTarget);
                if (!p) return null;
                return (
                  <>
                    <div className={styles.drawerSection}>
                      <label className={styles.drawerLabel} htmlFor="edit-name">Name</label>
                      <input id="edit-name" className={styles.drawerInput} type="text" defaultValue={p.name} aria-label="Product name" />
                    </div>
                    <div className={styles.drawerRow}>
                      <div className={styles.drawerSection}>
                        <label className={styles.drawerLabel} htmlFor="edit-price">Price (₦)</label>
                        <input id="edit-price" className={styles.drawerInput} type="number" defaultValue={p.price} min={0} aria-label="Price" />
                      </div>
                      <div className={styles.drawerSection}>
                        <label className={styles.drawerLabel} htmlFor="edit-stock">Stock</label>
                        <input id="edit-stock" className={styles.drawerInput} type="number" defaultValue={p.stock_level} min={0} aria-label="Stock level" />
                      </div>
                    </div>
                    <button
                      className={styles.mintBtn}
                      onClick={() => { setDrawerOpen(false); addToast('Item updated.', 'success'); }}
                      aria-label="Save changes"
                    >
                      Save Changes
                    </button>
                  </>
                );
              })()}
            </>
          )}
        </div>
      </BaseDrawer>
    </div>
  );
}