/**
 * StoreLayer — Phase 2J
 * 6th Architect layer: per-type store behaviour settings.
 * Reads store type from useMerchantStore via useStoreType().
 * Updates draftConfig.store_type_config via the shared onUpdate callback.
 */

import type { StoreConfig, StoreTypeConfig } from '@/lib/types';
import { useStoreType } from '@/lib/hooks/use-store-type';
import styles from './StoreLayer.module.css';

interface StoreLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

// ── Shared helpers ───────────────────────────────────────────────────────────

interface SectionTypeSettingsProps {
  tc: StoreTypeConfig;
  updateTypeConfig: (patch: Partial<StoreTypeConfig>) => void;
}

function OptionRow({
  options,
  active,
  onSelect,
}: {
  options: { value: string; label: string }[];
  active: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className={styles.optionRow}>
      {options.map(({ value, label }) => (
        <button
          key={value}
          className={`${styles.optionBtn} ${active === value ? styles.optionBtnActive : ''}`}
          onClick={() => onSelect(value)}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Collector ────────────────────────────────────────────────────────────────

function CollectorSettings({ tc, updateTypeConfig }: SectionTypeSettingsProps) {
  return (
    <div className={styles.typeSection}>
      <p className={`${styles.typeNote} t-body`}>
        Featured items are managed from your Dashboard → Share Store.
      </p>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Drop announcement banner</label>
        <input
          type="text"
          className={styles.input}
          value={tc.drop_banner_text ?? ''}
          placeholder="e.g. New drop this Friday at 7pm"
          onChange={(e) => updateTypeConfig({ drop_banner_text: e.target.value || null })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Sold-out items</label>
        <OptionRow
          options={[
            { value: 'dim',          label: 'Dim' },
            { value: 'strikethrough', label: 'Strikethrough' },
            { value: 'badge',        label: 'Badge' },
          ]}
          active={tc.sold_out_overlay_style}
          onSelect={(v) => updateTypeConfig({ sold_out_overlay_style: v as StoreTypeConfig['sold_out_overlay_style'] })}
        />
      </div>
    </div>
  );
}

// ── Vendor ───────────────────────────────────────────────────────────────────

function VendorSettings({ tc, updateTypeConfig }: SectionTypeSettingsProps) {
  return (
    <div className={styles.typeSection}>
      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Dormant window message</label>
        <input
          type="text"
          className={styles.input}
          value={tc.window_banner_text ?? ''}
          placeholder="e.g. New window every Saturday. Follow for updates."
          onChange={(e) => updateTypeConfig({ window_banner_text: e.target.value || null })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Pre-order button text</label>
        <input
          type="text"
          className={styles.input}
          value={tc.preorder_cta_text}
          placeholder="Pre-order"
          onChange={(e) => updateTypeConfig({ preorder_cta_text: e.target.value })}
        />
      </div>
    </div>
  );
}

// ── Host ─────────────────────────────────────────────────────────────────────

function HostSettings({ tc, updateTypeConfig }: SectionTypeSettingsProps) {
  return (
    <div className={styles.typeSection}>
      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Booking button text</label>
        <input
          type="text"
          className={styles.input}
          value={tc.booking_cta_text}
          placeholder="Book a Slot"
          onChange={(e) => updateTypeConfig({ booking_cta_text: e.target.value })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Calendar display</label>
        <OptionRow
          options={[
            { value: 'week',  label: 'Week view' },
            { value: 'month', label: 'Month view' },
          ]}
          active={tc.calendar_format}
          onSelect={(v) => updateTypeConfig({ calendar_format: v as StoreTypeConfig['calendar_format'] })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Portfolio density</label>
        <OptionRow
          options={[
            { value: 'compact', label: 'Compact' },
            { value: 'medium',  label: 'Medium' },
            { value: 'airy',    label: 'Airy' },
          ]}
          active={tc.portfolio_density}
          onSelect={(v) => updateTypeConfig({ portfolio_density: v as StoreTypeConfig['portfolio_density'] })}
        />
      </div>
    </div>
  );
}

// ── Digital Creator ──────────────────────────────────────────────────────────

function DigitalSettings({ tc, updateTypeConfig }: SectionTypeSettingsProps) {
  return (
    <div className={styles.typeSection}>
      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Catalogue layout</label>
        <OptionRow
          options={[
            { value: 'grid', label: 'Grid' },
            { value: 'list', label: 'List' },
          ]}
          active={tc.catalogue_display}
          onSelect={(v) => updateTypeConfig({ catalogue_display: v as StoreTypeConfig['catalogue_display'] })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Free product badge</label>
        <OptionRow
          options={[
            { value: 'pill',   label: 'Pill' },
            { value: 'corner', label: 'Corner' },
            { value: 'none',   label: 'None' },
          ]}
          active={tc.free_badge_style}
          onSelect={(v) => updateTypeConfig({ free_badge_style: v as StoreTypeConfig['free_badge_style'] })}
        />
      </div>
    </div>
  );
}

// ── Studio ───────────────────────────────────────────────────────────────────

const ENQUIRY_FIELDS: { key: string; label: string }[] = [
  { key: 'event_type',        label: 'Event Type' },
  { key: 'date',              label: 'Date' },
  { key: 'deliverable_count', label: 'Deliverable Count' },
  { key: 'reference_links',   label: 'Reference Links' },
  { key: 'budget_range',      label: 'Budget Range' },
  { key: 'location',          label: 'Location' },
  { key: 'additional_notes',  label: 'Additional Notes' },
];

function StudioSettings({ tc, updateTypeConfig }: SectionTypeSettingsProps) {
  return (
    <div className={styles.typeSection}>
      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Portfolio layout</label>
        <OptionRow
          options={[
            { value: 'masonry',   label: 'Masonry' },
            { value: 'grid',      label: 'Grid' },
            { value: 'editorial', label: 'Editorial' },
          ]}
          active={tc.portfolio_layout}
          onSelect={(v) => updateTypeConfig({ portfolio_layout: v as StoreTypeConfig['portfolio_layout'] })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Package cards</label>
        <OptionRow
          options={[
            { value: 'full',    label: 'Full detail' },
            { value: 'minimal', label: 'Minimal' },
          ]}
          active={tc.package_card_style}
          onSelect={(v) => updateTypeConfig({ package_card_style: v as StoreTypeConfig['package_card_style'] })}
        />
      </div>

      <div className={styles.field}>
        <label className={`${styles.label} t-caps`}>Enquiry form fields</label>
        <div className={styles.checkList}>
          {ENQUIRY_FIELDS.map(({ key, label }) => (
            <label key={key} className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkInput}
                checked={tc.enquiry_form_fields.includes(key)}
                onChange={(e) => {
                  const current = tc.enquiry_form_fields;
                  updateTypeConfig({
                    enquiry_form_fields: e.target.checked
                      ? [...current, key]
                      : current.filter((f) => f !== key),
                  });
                }}
              />
              <span className={styles.checkLabel}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function StoreLayer({ draftConfig, onUpdate }: StoreLayerProps) {
  const st = useStoreType();

  const updateTypeConfig = (patch: Partial<StoreTypeConfig>) => {
    onUpdate({
      store_type_config: { ...draftConfig.store_type_config, ...patch },
    });
  };

  const tc = draftConfig.store_type_config;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Store Settings</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Customise how your store behaves.
        </p>
      </div>

      {st.isCollector && (
        <CollectorSettings tc={tc} updateTypeConfig={updateTypeConfig} />
      )}
      {st.isVendor && (
        <VendorSettings tc={tc} updateTypeConfig={updateTypeConfig} />
      )}
      {st.isHost && (
        <HostSettings tc={tc} updateTypeConfig={updateTypeConfig} />
      )}
      {st.isDigital && (
        <DigitalSettings tc={tc} updateTypeConfig={updateTypeConfig} />
      )}
      {st.isStudio && (
        <StudioSettings tc={tc} updateTypeConfig={updateTypeConfig} />
      )}
    </section>
  );
}
