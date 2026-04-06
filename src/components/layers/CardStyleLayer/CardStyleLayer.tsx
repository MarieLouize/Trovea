import { m } from '@/lib/motion';
import type { StoreConfig, CardStyle } from '@/lib/types';
import { FIXTURE_PRODUCTS } from '@/lib/fixtures';
import { formatCurrencyFull } from '@/lib/utils/format';
import styles from './CardStyleLayer.module.css';

interface CardStyleLayerProps {
  draftConfig: StoreConfig;
  onUpdate: (patch: Partial<StoreConfig>) => void;
}

// CardStyle actual values: 'clean-square' | 'rounded-float' | 'polaroid' | 'film-strip' | 'minimal-line'
const CARD_STYLES: { id: CardStyle; label: string; description: string }[] = [
  { id: 'clean-square',   label: 'Clean Square',   description: 'Neumorphic raised card. Sharp edges, clean layout.' },
  { id: 'rounded-float',  label: 'Rounded Float',  description: 'Large image with generous rounded corners.' },
  { id: 'polaroid',       label: 'Polaroid',       description: 'White frame with italic caption underneath.' },
  { id: 'film-strip',     label: 'Film Strip',     description: 'Vintage dark strip with mono name and gold price.' },
  { id: 'minimal-line',   label: 'Minimal Line',   description: 'No card. Just image and text on the grid.' },
];

const previewProduct = FIXTURE_PRODUCTS.find((p: any) => p.status === 'live') ?? FIXTURE_PRODUCTS[0];

function MiniCard({ style }: { style: CardStyle }) {
  const price = formatCurrencyFull((previewProduct as any).price ?? 0);
  const name: string = (previewProduct as any).name ?? 'Item';

  switch (style) {
    case 'clean-square':
      return (
        <div className={styles.miniEditorial}>
          <div className={styles.miniImg} />
          <div className={styles.miniBody}>
            <span className={styles.miniName}>{name}</span>
            <span className={styles.miniPrice}>{price}</span>
          </div>
        </div>
      );
    case 'rounded-float':
      return (
        <div className={styles.miniGallery}>
          <div className={`${styles.miniImg} ${styles.miniImgTall}`} />
          <div className={styles.miniBodyPad}>
            <span className={styles.miniName}>{name}</span>
            <span className={styles.miniPrice}>{price}</span>
          </div>
        </div>
      );
    case 'polaroid':
      return (
        <div className={styles.miniStamp}>
          <div className={styles.miniImg} />
          <span className={`${styles.miniName} ${styles.miniNameItalic}`}>{name}</span>
          <span className={styles.miniPrice}>{price}</span>
        </div>
      );
    case 'film-strip':
      return (
        <div className={styles.miniReceipt}>
          <div className={styles.miniPerfs} />
          <div className={`${styles.miniImg} ${styles.miniImgDark}`} />
          <div className={styles.miniReceiptBody}>
            <span className={`${styles.miniName} ${styles.miniNameMono}`}>{name.toUpperCase().slice(0, 14)}</span>
            <span className={`${styles.miniPrice} ${styles.miniPriceGold}`}>{price}</span>
          </div>
          <div className={styles.miniPerfs} />
        </div>
      );
    case 'minimal-line':
      return (
        <div className={styles.miniMinimal}>
          <div className={styles.miniMinimalThumb} />
          <div className={styles.miniMinimalText}>
            <span className={styles.miniNameSerif}>{name}</span>
            <span className={styles.miniPrice}>{price}</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function CardStyleLayer({ draftConfig, onUpdate }: CardStyleLayerProps) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={`${styles.sectionTitle} t-title`}>Card Style</h2>
        <p className={`${styles.sectionDesc} t-body`}>
          Choose how individual products are displayed.
        </p>
      </div>

      <div className={styles.list} role="list" aria-label="Card styles">
        {CARD_STYLES.map((cardStyle) => {
          const isActive = draftConfig.card_style === cardStyle.id;
          return (
            <m.button
              key={cardStyle.id}
              role="listitem"
              className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              onClick={() => onUpdate({ card_style: cardStyle.id })}
              aria-label={`Select ${cardStyle.label} card style`}
              aria-pressed={isActive}
              whileTap={{ scale: 0.985 }}
            >
              <span className={styles.noise} aria-hidden="true" />
              <div className={styles.miniCardContainer} aria-hidden="true">
                <MiniCard style={cardStyle.id} />
              </div>
              <div className={styles.info}>
                <div className={styles.infoTop}>
                  <span className={`${styles.styleName} t-title`}>{cardStyle.label}</span>
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
                <p className={`${styles.styleDesc} t-body`}>{cardStyle.description}</p>
              </div>
            </m.button>
          );
        })}
      </div>
    </section>
  );
}