import { useState } from 'react';
import { m, Reorder, useDragControls } from '@/lib/motion';
import { GripVertical } from 'lucide-react';
import type { StoreConfig, StoreLayout, SectionStates } from '@/lib/types';
import { LAYOUTS } from '@/lib/constants/layouts';
import styles from './LayoutLayer.module.css';

interface LayoutLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

/* Mini visual layout representations using CSS */
function LayoutMinimap({ id }: { id: StoreLayout }) {
  switch (id) {
    case 'grid-dense':
      return (
        <div className={styles.minimapGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.minimapCell} />
          ))}
        </div>
      );
    case 'grid-airy':
      return (
        <div className={styles.minimapGridAiry}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.minimapCell} ${styles.minimapCellTall}`} />
          ))}
        </div>
      );
    case 'editorial':
      return (
        <div className={styles.minimapEditorial}>
          <div className={`${styles.minimapCell} ${styles.minimapCellHero}`} />
          <div className={styles.minimapEditorialRow}>
            <div className={styles.minimapCell} />
            <div className={styles.minimapCell} />
          </div>
          <div className={`${styles.minimapCell} ${styles.minimapCellWide}`} />
        </div>
      );
    case 'masonry':
      return (
        <div className={styles.minimapMasonry}>
          <div className={styles.minimapMasonryCol}>
            <div className={`${styles.minimapCell} ${styles.minimapCellTall}`} />
            <div className={styles.minimapCell} />
          </div>
          <div className={styles.minimapMasonryCol}>
            <div className={styles.minimapCell} />
            <div className={`${styles.minimapCell} ${styles.minimapCellTall}`} />
          </div>
        </div>
      );
    case 'minimal':
      return (
        <div className={styles.minimapMinimal}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.minimapListRow}>
              <div className={styles.minimapListThumb} />
              <div className={styles.minimapListText}>
                <div className={styles.minimapTextLine} />
                <div className={`${styles.minimapTextLine} ${styles.minimapTextLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

/* ── Section Editor (Part B) ── */

type SectionStateKey = keyof SectionStates;

const SECTION_LABELS: Record<SectionStateKey, string> = {
  'section-hero':     'Hero Banner',
  'section-about':    'About',
  'section-slots':    'Slots',
  'section-featured': 'Featured Items',
};

function SectionRow({
  sectionKey,
  enabled,
  onToggle,
}: {
  sectionKey: SectionStateKey;
  enabled: boolean;
  onToggle: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={sectionKey}
      dragListener={false}
      dragControls={dragControls}
      className={styles.sectionRow}
      as="div"
    >
      <button
        className={styles.dragHandle}
        onPointerDown={(e) => dragControls.start(e)}
        aria-label={`Drag ${SECTION_LABELS[sectionKey]}`}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        <GripVertical size={14} />
      </button>

      <span className={`${styles.sectionLabel} t-body`}>
        {SECTION_LABELS[sectionKey]}
      </span>

      <label className={styles.toggle} aria-label={`Toggle ${SECTION_LABELS[sectionKey]}`}>
        <input
          type="checkbox"
          className={styles.toggleInput}
          checked={enabled}
          onChange={onToggle}
        />
        <span className={`${styles.toggleSlider} ${enabled ? styles.toggleSliderOn : ''}`} />
      </label>
    </Reorder.Item>
  );
}

export default function LayoutLayer({ draftConfig, onUpdate }: LayoutLayerProps) {
  const handleSelect = (id: StoreLayout) => {
    onUpdate({ layout: id });
  };

  const ALL_SECTION_KEYS = Object.keys(draftConfig.section_states) as SectionStateKey[];
  const [sectionOrder, setSectionOrder] = useState<SectionStateKey[]>(
    draftConfig.section_order ?? ALL_SECTION_KEYS
  );

  const handleReorder = (newOrder: SectionStateKey[]) => {
    setSectionOrder(newOrder);
    onUpdate({ section_order: newOrder });
  };

  const handleToggleSection = (key: SectionStateKey) => {
    onUpdate({
      section_states: {
        ...draftConfig.section_states,
        [key]: !draftConfig.section_states[key],
      },
    });
  };

  return (
    <section className={styles.section}>
      {/* ── Part A: Layout options ── */}
      <div className={styles.subSection}>
        <div className={styles.header}>
          <h2 className={`${styles.sectionTitle} t-title`}>Layout</h2>
          <p className={`${styles.sectionDesc} t-body`}>
            Control how products are displayed on your store.
          </p>
        </div>

        <div className={styles.list} role="list" aria-label="Store layouts">
          {LAYOUTS.map((layout) => {
            const isActive = draftConfig.layout === layout.id;
            return (
              <m.button
                key={layout.id}
                role="listitem"
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => handleSelect(layout.id)}
                aria-label={`Select ${layout.name} layout`}
                aria-pressed={isActive}
                whileTap={{ scale: 0.985 }}
              >
                <span className={styles.noise} aria-hidden="true" />

                {/* Minimap visual */}
                <div className={styles.minimap} aria-hidden="true">
                  <LayoutMinimap id={layout.id} />
                </div>

                {/* Info */}
                <div className={styles.info}>
                  <div className={styles.infoTop}>
                    <span className={`${styles.layoutName} t-title`}>{layout.name}</span>
                    {isActive && (
                      <m.span
                        className={`${styles.activeBadge} t-caps`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        Active
                      </m.span>
                    )}
                  </div>
                  <p className={`${styles.layoutDesc} t-body`}>{layout.description}</p>
                </div>
              </m.button>
            );
          })}
        </div>
      </div>

      {/* ── Part B: Section editor ── */}
      <div className={styles.subSection}>
        <div className={styles.header}>
          <h3 className={`${styles.subSectionTitle} t-caps`}>Section Order</h3>
          <p className={`${styles.sectionDesc} t-body`}>
            Drag to reorder · Toggle to show/hide sections.
          </p>
        </div>

        <div className={styles.sectionEditorCard}>
          <span className={styles.noise} aria-hidden="true" />
          <Reorder.Group
            axis="y"
            values={sectionOrder}
            onReorder={handleReorder}
            className={styles.sectionList}
            role="list"
            as="div"
          >
            {sectionOrder.map((key) => (
              <SectionRow
                key={key}
                sectionKey={key}
                enabled={draftConfig.section_states[key]}
                onToggle={() => handleToggleSection(key)}
              />
            ))}
          </Reorder.Group>
        </div>
      </div>
    </section>
  );
}
