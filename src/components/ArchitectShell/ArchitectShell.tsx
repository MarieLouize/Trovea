import { useState } from 'react';
import { ArrowLeft, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import type { StoreConfig } from '@/lib/types';
import { type LayerId, LAYER_ORDER } from '../../lib/types/architect.types';
import LayerNav from '../LayerNav/LayerNav';
import LivePreview from '../LivePreview/LivePreview';
import PaletteLayer from '../layers/PaletteLayer/PaletteLayer';
import LayoutLayer from '../layers/LayoutLayer/LayoutLayer';
import TypographyLayer from '../layers/TypographyLayer/TypographyLayer';
import CardStyleLayer from '../layers/CardStyleLayer/CardStyleLayer';
import SignatureLayer from '../layers/SignatureLayer/SignatureLayer';
import StoreLayer from '../layers/StoreLayer';
import styles from './ArchitectShell.module.css';

interface ArchitectShellProps {
  handle: string;
  draftConfig: StoreConfig;
  isDirty: boolean;
  isPublishing: boolean;
  onUpdate: (patch: Partial<StoreConfig>) => void;
  onPublish: () => void;
  onDiscard: () => void;
}

export default function ArchitectShell({
  handle,
  draftConfig,
  isDirty,
  isPublishing,
  onUpdate,
  onPublish,
  onDiscard,
}: ArchitectShellProps) {
  const [activeLayer, setActiveLayer] = useState<LayerId>('palette');
  const [prevLayerIndex, setPrevLayerIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSetLayer = (id: LayerId) => {
    setPrevLayerIndex(LAYER_ORDER.indexOf(activeLayer));
    setActiveLayer(id);
  };

  const currentIndex = LAYER_ORDER.indexOf(activeLayer);
  const direction = currentIndex > prevLayerIndex ? 1 : -1;

  const layerProps = { draftConfig, onUpdate };

  const layerMap: Record<LayerId, React.ReactNode> = {
    palette:    <PaletteLayer {...layerProps} />,
    layout:     <LayoutLayer {...layerProps} />,
    typography: <TypographyLayer {...layerProps} />,
    card:       <CardStyleLayer {...layerProps} />,
    signature:  <SignatureLayer {...layerProps} />,
    store:      <StoreLayer {...layerProps} />,
  };

  return (
    <div className={styles.shell}>
      {/* ── Top Bar ── */}
      <header className={styles.topBar}>
        <Link
          to={`/store/${handle}`}
          className={styles.backBtn}
          aria-label="Back to storefront"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className={styles.topBarCenter}>
          <span className={styles.topBarTitle}>Customize Store</span>
          {isDirty && <span className={styles.dirtyDot} aria-label="Unsaved changes" />}
        </div>

        <div className={styles.topBarActions}>
          {isDirty && !isPublishing && (
            <button
              className={styles.discardBtn}
              onClick={onDiscard}
              aria-label="Discard changes"
            >
              Discard
            </button>
          )}
          <button
            className={`${styles.publishBtn} ${isPublishing ? styles.publishBtnBusy : ''}`}
            onClick={onPublish}
            disabled={isPublishing}
            aria-label="Publish store changes"
          >
            {isPublishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className={styles.body}>
        {/* Left pane: layer nav + controls */}
        <aside className={styles.leftPane}>
          <LayerNav activeLayer={activeLayer} onSelectLayer={handleSetLayer} />

          <div className={styles.layerContent}>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={activeLayer}
                initial={{ opacity: 0, x: direction * 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -18 }}
                transition={{ duration: 0.18, ease: [0.32, 0, 0.16, 1] }}
                className={styles.layerContentInner}
              >
                {layerMap[activeLayer]}
              </m.div>
            </AnimatePresence>
          </div>
        </aside>

        {/* Right pane: live preview (desktop only) */}
        <main className={styles.rightPane} aria-label="Live store preview">
          <LivePreview draftConfig={draftConfig} />
        </main>
      </div>

      {/* ── Mobile preview FAB ── */}
      <button
        className={styles.previewFab}
        onClick={() => setPreviewOpen(true)}
        aria-label="Preview store"
      >
        <Eye size={20} />
        <span className={styles.previewFabLabel}>Preview</span>
      </button>

      {/* ── Mobile preview sheet ── */}
      <AnimatePresence>
        {previewOpen && (
          <>
            <m.div
              className={styles.previewBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewOpen(false)}
            />
            <m.div
              className={styles.previewSheet}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80) setPreviewOpen(false);
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            >
              <div className={styles.previewSheetHandle} />
              <div className={styles.previewSheetHeader}>
                <span className={styles.previewSheetTitle}>Live Preview</span>
                <button
                  className={styles.previewSheetClose}
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
              <div className={styles.previewSheetBody}>
                <LivePreview draftConfig={draftConfig} />
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile dirty bar ── */}
      <AnimatePresence>
        {isDirty && (
          <m.div
            className={styles.dirtyBar}
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            <span className={styles.dirtyBarText}>Unsaved changes</span>
            <div className={styles.dirtyBarActions}>
              <button
                className={styles.dirtyDiscardBtn}
                onClick={onDiscard}
                disabled={isPublishing}
              >
                Discard
              </button>
              <button
                className={`${styles.dirtyPublishBtn} ${isPublishing ? styles.publishBtnBusy : ''}`}
                onClick={onPublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
