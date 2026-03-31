import { Palette, LayoutGrid, Type, Square, Layers, SlidersHorizontal } from 'lucide-react';
import { m } from '@/lib/motion';
import type { LayerId } from '../../lib/types/architect.types';
import styles from './LayerNav.module.css';

interface LayerNavProps {
  activeLayer: LayerId;
  onSelectLayer: (id: LayerId) => void;
}

const LAYERS: { id: LayerId; label: string; Icon: React.ElementType }[] = [
  { id: 'palette',    label: 'Palette',    Icon: Palette },
  { id: 'layout',     label: 'Layout',     Icon: LayoutGrid },
  { id: 'typography', label: 'Typography', Icon: Type },
  { id: 'card',       label: 'Card Style', Icon: Square },
  { id: 'signature',  label: 'Signature',  Icon: Layers },
  { id: 'store',      label: 'Store',      Icon: SlidersHorizontal },
];

export default function LayerNav({ activeLayer, onSelectLayer }: LayerNavProps) {
  return (
    <nav className={styles.nav} aria-label="Customization layers">
      <div className={styles.navInner} role="list">
        {LAYERS.map(({ id, label, Icon }) => {
          const isActive = activeLayer === id;
          return (
            <button
              key={id}
              role="listitem"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => onSelectLayer(id)}
              aria-label={`${label} layer`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <m.span
                  className={styles.activePill}
                  layoutId="layer-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 38 }}
                />
              )}
              <span className={styles.navIcon}>
                <Icon size={16} />
              </span>
              <span className={styles.navLabel}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
