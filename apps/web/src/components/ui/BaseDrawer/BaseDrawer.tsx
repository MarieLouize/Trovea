import { useEffect } from 'react';
import { m, AnimatePresence, SPRING_UI } from '@/lib/motion';
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
  animate: { y: 0, transition: SPRING_UI },
  exit: { y: '100%', transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

const rightVariants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: SPRING_UI },
  exit: { x: '100%', transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
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
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalStyle; };
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
            transition={{ duration: 0.22 }}
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
            dragDirectionLock
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 600) onClose();
            }}
          >
            {position === 'bottom' && (
              <div className={styles.handleWrap}>
                <div className={styles.handle} aria-hidden="true" />
              </div>
            )}
            {title && (
              <div className={styles.drawerHeader}>
                <h2 className={styles.drawerTitle}>
                  {title}
                </h2>
              </div>
            )}
            <div className={styles.content} onPointerDown={(e) => e.stopPropagation()}>
              {children}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}