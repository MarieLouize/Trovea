import { useState } from 'react';
import { m, AnimatePresence } from '@/lib/motion';
import styles from './Tooltip.module.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  children: React.ReactNode;
}

const positionClass: Record<TooltipPosition, string> = {
  top: styles.tipTop,
  bottom: styles.tipBottom,
  left: styles.tipLeft,
  right: styles.tipRight,
};

export default function Tooltip({ content, position = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <m.span
            role="tooltip"
            className={`${styles.tip} ${positionClass[position]}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
          >
            {content}
          </m.span>
        )}
      </AnimatePresence>
    </span>
  );
}