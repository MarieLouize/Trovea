import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Flag,
  BadgeCheck,
  ShieldOff,
  Receipt,
  Menu,
  X,
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import ErrorBoundary from '@/components/ui/ErrorBoundary/ErrorBoundary';
import { useAdminStore } from '@/lib/store/admin.store';
import { FIXTURE_REPORTS } from '@/lib/fixtures';
import styles from './AdminShell.module.css';

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/admin',              label: 'Overview',     icon: <LayoutDashboard size={15} />, exact: true },
  { path: '/admin/stores',       label: 'Stores',       icon: <Store size={15} /> },
  { path: '/admin/reports',      label: 'Reports',      icon: <Flag size={15} />, badge: true },
  { path: '/admin/verification', label: 'Verification', icon: <BadgeCheck size={15} /> },
  { path: '/admin/suspensions',  label: 'Suspensions',  icon: <ShieldOff size={15} /> },
  { path: '/admin/receipts',     label: 'Receipts',     icon: <Receipt size={15} /> },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminShell() {
  const { pathname } = useLocation();
  const { reportStatuses } = useAdminStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Count pending reports (apply runtime status overrides)
  const pendingReports = FIXTURE_REPORTS.filter(
    (r) => (reportStatuses[r.id] ?? r.status) === 'pending',
  ).length;

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <div className={styles.shell}>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <nav className={styles.sidebar} aria-label="Admin navigation">
        <div className={styles.logoArea}>
          <div className={styles.wordmark}>
            TROV<span className={styles.wordmarkApos}>É</span>A
          </div>
          <span className={styles.wordmarkSub}>· ADMIN</span>
        </div>

        <div className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path, item.exact);
            const showBadge = item.badge && pendingReports > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {showBadge && (
                  <span className={styles.navBadge} aria-label={`${pendingReports} pending`}>
                    {pendingReports}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className={styles.sidebarFooter}>
          <span className={styles.footerNote}>Platform Admin · v1</span>
        </div>
      </nav>

      {/* ══ MOBILE TOP BAR ══ */}
      <header className={styles.topBar}>
        <div className={styles.topBarLogo}>
          TROV<span className={styles.topBarLogoApos}>É</span>A
          <span className={styles.topBarLogoSub}> · ADMIN</span>
        </div>
        <div ref={menuRef} className={styles.menuWrapper}>
          <button
            className={styles.menuBtn}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <m.div
                  className={styles.menuBackdrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <m.div
                  className={styles.mobileMenu}
                  role="menu"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.32, 0, 0.16, 1] }}
                >
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.path, item.exact);
                    const showBadge = item.badge && pendingReports > 0;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        className={`${styles.mobileMenuItem} ${active ? styles.mobileMenuItemActive : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className={styles.mobileMenuIcon}>{item.icon}</span>
                        {item.label}
                        {showBadge && (
                          <span className={styles.navBadge}>{pendingReports}</span>
                        )}
                      </Link>
                    );
                  })}
                </m.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ══ MAIN CONTENT ══ */}
      <main className={styles.main}>
        <ErrorBoundary key={pathname} pageName={pathname.split('/')[2] ?? 'admin'}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
