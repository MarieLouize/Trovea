import { m, AnimatePresence } from '@/lib/motion';
import { useUIStore } from '@/lib/store/ui.store';
import styles from './Toast.module.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className={styles.container} aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className={`${styles.toast} ${
              toast.type === 'error' ? styles.toastError : ''
            } ${toast.type === 'info' ? styles.toastInfo : ''}`}
            onClick={() => removeToast(toast.id)}
            style={{ cursor: 'pointer' }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>{toast.message}</span>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}