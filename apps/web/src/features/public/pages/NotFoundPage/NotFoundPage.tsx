import { useNavigate, Link } from 'react-router-dom';
import { m } from '@/lib/motion';
import { Home, ArrowLeft, Ghost } from 'lucide-react';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.brandBar}>
        <Link to="/" className={styles.brandLogo}>
          Trov<span className={styles.brandLogoApos}>é</span>a
        </Link>
      </div>

      <m.div 
        className={styles.content}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.iconWrap}>
          <Ghost size={40} strokeWidth={1.5} />
        </div>

        <div>
          <h1 className={styles.title}>404</h1>
          <p className={styles.text}>
            The page you're looking for has vanished into the archive. 
            It may have been moved or deleted.
          </p>
        </div>

        <div className={styles.actions}>
          <Link to="/dashboard" className={styles.homeBtn}>
            <Home size={18} />
            Go to Dashboard
          </Link>
          <button 
            className={styles.backBtn} 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={14} style={{ marginRight: 8, display: 'inline' }} />
            Go Back
          </button>
        </div>
      </m.div>
    </div>
  );
}
