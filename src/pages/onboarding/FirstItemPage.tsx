import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Package, Sparkles } from 'lucide-react';
import { parseSmartPaste } from '@/lib/utils/smart-paste';
import { formatCurrencyFull } from '@/lib/utils/format';
import styles from './FirstItemPage.module.css';

interface ManualItem {
  name: string;
  price: string;
  stock: string;
}

const ghostVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export default function FirstItemPage() {
  const navigate = useNavigate();
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState<ReturnType<typeof parseSmartPaste>>([]);
  const [manual, setManual] = useState<ManualItem>({ name: '', price: '', stock: '1' });
  const [useManual, setUseManual] = useState(false);

  // Trigger parse synchronously on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    setPasteText(pasted);
    const result = parseSmartPaste(pasted);
    setParsedItems(result);
    if (result.length > 0) setUseManual(false);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPasteText(val);
    if (val.trim()) {
      const result = parseSmartPaste(val);
      setParsedItems(result);
    } else {
      setParsedItems([]);
    }
  };

  const canMintManual =
    useManual && manual.name.trim().length > 0 && parseFloat(manual.price) > 0;

  const canMintParsed =
    !useManual && parsedItems.length > 0 && parsedItems.every((i) => i.name && i.price > 0);

  const canMint = canMintManual || canMintParsed;

  const mintCount = useManual ? 1 : parsedItems.length;

  const handleMint = () => {
    if (!canMint) return;
    navigate('/dashboard');
  };

  return (
    <div className={styles.root}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.cardInner}>
          {/* Progress */}
          <div className={styles.progressBar}>
            <div className={styles.progressMeta}>
              <span className={styles.progressStep}>Step 5 of 5</span>
              <span className={styles.progressStep}>First Item</span>
            </div>
            <div className={styles.progressTrack} role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: '80%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.6, ease: [0.34, 1.2, 0.64, 1] }}
              />
            </div>
          </div>

          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.headline}>Mint your first item</h1>
            <p className={styles.subtext}>
              Paste a WhatsApp caption and we'll extract the details — or fill in manually.
            </p>
          </div>

          {/* Smart Paste */}
          <div className={styles.smartPasteArea}>
            <div className={styles.smartPasteLabel}>
              <label className={styles.fieldLabel} htmlFor="paste-area">
                Paste Caption
              </label>
              <span className={styles.smartBadge}>Smart Paste</span>
            </div>
            <textarea
              id="paste-area"
              className={styles.pasteTextarea}
              placeholder={'✨ Ankara Wrap Dress\n₦22,000 | Available: 3\nSizes: S, M, L\n#ankara #thrift #dress'}
              value={pasteText}
              onChange={handlePasteChange}
              onPaste={handlePaste}
              aria-label="Paste product caption for smart parsing"
              rows={5}
            />
            <p className={styles.pasteHint}>
              Paste any WhatsApp product caption. Trove'a will extract the name, price, quantity, and variants.
            </p>
          </div>

          {/* Parsed ghost cards */}
          <AnimatePresence>
            {parsedItems.length > 0 && !useManual && (
              <motion.div
                className={styles.ghostCards}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {parsedItems.map((item, i) => (
                  <motion.div
                    key={`${item.name}-${i}`}
                    className={styles.ghostCard}
                    custom={i}
                    variants={ghostVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <div className={styles.ghostCardIcon} aria-hidden="true">
                      <Package size={16} />
                    </div>
                    <div className={styles.ghostCardBody}>
                      <div className={styles.ghostCardName}>{item.name || 'Unnamed item'}</div>
                      <div className={styles.ghostCardMeta}>
                        Qty: {item.quantity}
                        {item.variantHints.length > 0 && ` · ${item.variantHints.join(', ')}`}
                        {item.tags.length > 0 && ` · #${item.tags[0]}`}
                      </div>
                    </div>
                    <div className={styles.ghostCardPrice}>
                      {item.price > 0 ? formatCurrencyFull(item.price) : '—'}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* OR / Manual toggle */}
          <div className={styles.orDivider}>
            <div className={styles.orLine} />
            <span className={styles.orText}>or fill in manually</span>
            <div className={styles.orLine} />
          </div>

          {/* Manual form */}
          <div className={styles.manualForm}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="item-name">
                Item Name
              </label>
              <input
                id="item-name"
                className={styles.input}
                type="text"
                placeholder="Ankara Wrap Dress"
                value={manual.name}
                onChange={(e) => {
                  setManual((m) => ({ ...m, name: e.target.value }));
                  if (e.target.value) setUseManual(true);
                }}
                aria-label="Item name"
              />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="item-price">
                  Price (₦)
                </label>
                <input
                  id="item-price"
                  className={styles.input}
                  type="number"
                  placeholder="22000"
                  value={manual.price}
                  onChange={(e) => {
                    setManual((m) => ({ ...m, price: e.target.value }));
                    if (e.target.value) setUseManual(true);
                  }}
                  min={0}
                  aria-label="Item price in naira"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="item-stock">
                  Stock
                </label>
                <input
                  id="item-stock"
                  className={styles.input}
                  type="number"
                  placeholder="1"
                  value={manual.stock}
                  onChange={(e) => setManual((m) => ({ ...m, stock: e.target.value }))}
                  min={1}
                  aria-label="Stock quantity"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.mintBtn}
              onClick={handleMint}
              disabled={!canMint}
              aria-label={canMint ? `Mint ${mintCount} item${mintCount > 1 ? 's' : ''}` : 'Fill in item details to mint'}
            >
              <Sparkles size={14} aria-hidden="true" />
              {canMint
                ? `Mint ${mintCount > 1 ? `${mintCount} Assets` : 'Asset'} →`
                : 'Fill in item details'}
            </button>

            <button
              className={styles.skipBtn}
              onClick={() => navigate('/dashboard')}
              aria-label="Skip and go to dashboard"
            >
              Skip for now — go to Dashboard
            </button>

            <Link to="/onboarding/setup-store" className={styles.backLink} aria-label="Go back to store setup">
              <ArrowLeft size={12} aria-hidden="true" />
              Back
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}