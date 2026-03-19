import { useState, useEffect } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import { useGuideStore } from '@/lib/store/guide.store';
import styles from './GuideMarker.module.css';

interface GuideMarkerProps {
  id: string;
  prompt: string;
  reward: string;
  xp?: number;
}

export default function GuideMarker({ id, prompt, reward, xp = 10 }: GuideMarkerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { completeGuide, isComplete, completedGuides } = useGuideStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Only one tooltip open at a time
  useEffect(() => {
    if (isOpen) {
      setActiveId(id);
    } else if (activeId === id) {
      setActiveId(null);
    }
  }, [isOpen, id, activeId]);

  // Close if another marker opens
  useEffect(() => {
    if (activeId && activeId !== id) {
      setIsOpen(false);
    }
  }, [activeId, id]);

  // Only render in demo mode
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null;
  if (isComplete(id)) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    completeGuide(id);
    setIsOpen(false);
  };

  return (
    <div className={styles.markerWrapper}>
      <button
        className={styles.markerButton}
        onClick={handleClick}
        aria-label="Guide"
        data-active={isOpen}
      >
        ?
      </button>
      <AnimatePresence>
        {isOpen && (
          <m.div
            className={styles.tooltip}
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.tooltipContent}>
              <p className={styles.prompt}>{prompt}</p>
              <p className={styles.reward}>
                <span aria-hidden="true">✦</span> {reward}
              </p>
              <button
                className={styles.dismissBtn}
                onClick={handleDismiss}
                aria-label="Got it"
              >
                Got it
              </button>
              {xp > 0 && (
                <span className={styles.xpBadge}>+{xp} XP</span>
              )}
            </div>
            <div className={styles.tooltipArrow} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}