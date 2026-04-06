import { useState } from 'react';
import { m, Reorder, useDragControls } from '@/lib/motion';
import { GripVertical } from 'lucide-react';
import type { StoreConfig, StoreSignature, SectionStates } from '@/lib/types';
import { SIGNATURES } from '@/lib/constants/signatures';
import styles from './SignatureLayer.module.css';

interface SignatureLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

// Actual SectionStates keys from merchant.types.ts:
// 'section-hero' | 'section-about' | 'section-slots' | 'section-featured'
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

export default function SignatureLayer({ draftConfig, onUpdate }: SignatureLayerProps) {
  const ALL_SECTION_KEYS = Object.keys(draftConfig.section_states) as SectionStateKey[];

  const activeSignature = SIGNATURES.find((s) => s.id === draftConfig.signature);
  // Use signature's defaultSectionOrder filtered to only toggleable section_states keys,
  // falling back to all keys from the actual section_states object.
  const defaultOrder: SectionStateKey[] = (
    (activeSignature as any)?.defaultSectionOrder ??
    (activeSignature as any)?.sections ??
    ALL_SECTION_KEYS
  ).filter((k: string) => k in draftConfig.section_states) as SectionStateKey[];

  const initialOrder = defaultOrder.length > 0 ? defaultOrder : ALL_SECTION_KEYS;
  const [sectionOrder, setSectionOrder] = useState<SectionStateKey[]>(initialOrder);

  const handleSelectSignature = (id: StoreSignature) => {
    const sig = SIGNATURES.find((s) => s.id === id);
    onUpdate({ signature: id });
    if (sig) {
      const order = (
        (sig as any).defaultSectionOrder ??
        (sig as any).sections ??
        ALL_SECTION_KEYS
      ).filter((k: string) => k in draftConfig.section_states) as SectionStateKey[];
      if (order.length > 0) setSectionOrder(order);
    }
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
      {/* ── Sub-section A: Store Signature ── */}
      <div className={styles.subSection}>
        <div className={styles.header}>
          <h2 className={`${styles.sectionTitle} t-title`}>Signature</h2>
          <p className={`${styles.sectionDesc} t-body`}>
            Choose your store's default aesthetic template.
          </p>
        </div>

        <div className={styles.signatureGrid} role="list" aria-label="Store signatures">
          {SIGNATURES.map((sig) => {
            const isActive = draftConfig.signature === sig.id;
            const sections: string[] = (sig as any).defaultSectionOrder ?? (sig as any).sections ?? [];
            return (
              <m.button
                key={sig.id}
                role="listitem"
                className={`${styles.sigCard} ${isActive ? styles.sigCardActive : ''}`}
                onClick={() => handleSelectSignature(sig.id)}
                aria-label={`Select ${sig.name} signature`}
                aria-pressed={isActive}
                whileTap={{ scale: 0.97 }}
              >
                <span className={styles.noise} aria-hidden="true" />
                <div className={styles.sigInfo}>
                  <span className={`${styles.sigName} t-title`}>{sig.name}</span>
                  <p className={`${styles.sigDesc} t-body`}>{sig.tagline}</p>
                  <div className={styles.sigSections} aria-hidden="true">
                    {sections.slice(0, 3).map((s: string) => (
                      <span key={s} className={`${styles.sigSectionPill} t-caps`}>
                        {SECTION_LABELS[s as SectionStateKey] ?? s.replace('section-', '')}
                      </span>
                    ))}
                    {sections.length > 3 && (
                      <span className={`${styles.sigSectionPill} t-caps`}>
                        +{sections.length - 3}
                      </span>
                    )}
                  </div>
                </div>
                {isActive && (
                  <m.span
                    className={`${styles.activeBadge} t-caps`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    Active
                  </m.span>
                )}
              </m.button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-section B: Section Editor ── */}
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
            onReorder={setSectionOrder}
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