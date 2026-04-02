import { useEffect } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import styles from './BaseDrawer.module.css';

interface BaseDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'bottom' | 'right';
  title?: string;
}

const bottomVariants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { type: 'spring', stiffness: 340, damping: 38 } },
  exit: { y: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
};

const rightVariants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 340, damping: 38 } },
  exit: { x: '100%', transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } },
};

export default function BaseDrawer({
  open,
  onClose,
  children,
  position = 'bottom',
  title,
}: BaseDrawerProps) {
  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Escape key dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const variants = position === 'bottom' ? bottomVariants : rightVariants;
  const drawerClass = position === 'bottom' ? styles.drawerBottom : styles.drawerRight;

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Panel'}
            className={`${styles.drawer} ${drawerClass}`}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag={position === 'bottom' ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
          >
            {position === 'bottom' && <div className={styles.handle} aria-hidden="true" />}
            {title && (
              <div style={{ padding: '0 var(--space-6) var(--space-4)', position: 'relative', zIndex: 1 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 400 }}>
                  {title}
                </h2>
              </div>
            )}
            <div className={styles.content}>{children}</div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}