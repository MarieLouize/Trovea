import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Archive,
  BookOpen,
  Package,
  BarChart2,
  Settings,
  Bell,
  Plus,
  Store,
  MoreHorizontal,
  Receipt,
  Palette,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import ErrorBoundary from '@/components/primitives/ErrorBoundary/ErrorBoundary';
import { FIXTURE_MERCHANT } from '@/lib/fixtures';
import { useLedgerStore } from '@/lib/store/ledger.store';
import styles from './MerchantShell.module.css';

// ─── Nav config ────────────────────────────────────────────────────────────

const CORE_NAV = [
  { path: '/dashboard', label: 'Home',    icon: <LayoutDashboard size={16} /> },
  { path: '/ledger',    label: 'Ledger',  icon: <BookOpen size={16} />, badge: true },
  { path: '/archive',   label: 'Archive', icon: <Archive size={16} /> },
];

const MANAGE_NAV = [
  { path: '/dispatch',  label: 'Dispatch',  icon: <Package size={16} /> },
  { path: '/insights',  label: 'Insights',  icon: <BarChart2 size={16} /> },
];

const STORE_NAV = [
  { path: '/store/tolasarchive', label: 'View Store', icon: <Store size={16} /> },
  { path: '/store/tolasarchive/customize', label: 'Customize', icon: <Palette size={16} /> },
];

const ACCOUNT_NAV = [
  { path: '/notifications', label: 'Notifications', icon: <Bell size={16} />, badge: true },
  { path: '/settings',      label: 'Settings',       icon: <Settings size={16} /> },
];

// Primary mobile nav — 4 items + FAB
const MOBILE_PRIMARY = [
  { path: '/dashboard', label: 'Home',    icon: <LayoutDashboard size={18} /> },
  { path: '/ledger',    label: 'Ledger',  icon: <BookOpen size={18} />, badge: true },
  { path: '/archive',   label: 'Archive', icon: <Archive size={18} /> },
  { path: '/store/tolasarchive', label: 'Store', icon: <Store size={18} /> },
];

// More dropdown groups
const MORE_MANAGE = [
  { path: '/dispatch', label: 'Dispatch', icon: <Package size={14} /> },
  { path: '/insights', label: 'Insights', icon: <BarChart2 size={14} /> },
];
const MORE_STORE = [
  { path: '/ledger', label: 'Receipts', icon: <Receipt size={14} /> },
  { path: '/store/tolasarchive/customize', label: 'Customize', icon: <Palette size={14} /> },
  { path: '/store/tolasarchive', label: 'View Store', icon: <ExternalLink size={14} /> },
];
const MORE_ACCOUNT = [
  { path: '/settings', label: 'Settings', icon: <Settings size={14} /> },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function MerchantShell() {
  const { pathname } = useLocation();
  const { receipts } = useLedgerStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const pendingCount = receipts.filter((r) => r.payment_status === 'pending_payment').length;

  // Close More dropdown on route change
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const isActive = (path: string) => {
    if (path === '/store/tolasarchive') return pathname === '/store/tolasarchive';
    if (path === '/store/tolasarchive/customize') return pathname.includes('/customize');
    return pathname.startsWith(path);
  };

  const badge = (hasBadge?: boolean) =>
    hasBadge && pendingCount > 0 ? pendingCount : undefined;

  return (
    <div className={styles.shell}>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <nav className={styles.sidebar} aria-label="Merchant navigation">
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logo}>
            Trove<span className={styles.logoApostrophe}>'</span>a
          </div>
          <span className={styles.storeName}>{FIXTURE_MERCHANT.store_name}</span>
        </div>

        {/* Terminal CTA */}
        <div className={styles.terminalCta}>
          <Link to="/terminal" className={styles.terminalCtaBtn}>
            <Plus size={13} />
            New Seal
          </Link>
        </div>

        {/* Nav groups */}
        <div className={styles.navWrapper}>
          {/* Core */}
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Core</span>
            <div className={styles.navGroupItems}>
              {CORE_NAV.map((item) => {
                const b = badge(item.badge);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                    {b !== undefined && (
                      <span className={styles.navBadge} aria-label={`${b} pending`}>{b}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Manage */}
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Manage</span>
            <div className={styles.navGroupItems}>
              {MANAGE_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Store */}
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Store</span>
            <div className={styles.navGroupItems}>
              {STORE_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Account</span>
            <div className={styles.navGroupItems}>
              {ACCOUNT_NAV.map((item) => {
                const b = badge(item.badge);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`${styles.navItem} ${isActive(item.path) ? styles.navItemActive : ''}`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                    {b !== undefined && (
                      <span className={styles.navBadge}>{b}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* ══ MOBILE TOP UTILITY BAR ══ */}
      <header className={styles.topBar}>
        <Link to="/dashboard" className={styles.topBarLogo}>
          Trove<span className={styles.topBarLogoApos}>'</span>a
        </Link>
        <div className={styles.topBarActions}>
          {/* Bell */}
          <Link
            to="/notifications"
            className={styles.topBarIconBtn}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {pendingCount > 0 && (
              <span className={styles.topBarBadge}>{pendingCount}</span>
            )}
          </Link>

          {/* More */}
          <div className={styles.moreWrapper} ref={moreRef}>
            <button
              className={styles.topBarIconBtn}
              aria-label="More options"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
            >
              <MoreHorizontal size={16} />
            </button>

            {moreOpen && (
              <>
                <div
                  className={styles.moreBackdrop}
                  onClick={() => setMoreOpen(false)}
                  aria-hidden="true"
                />
                <div className={styles.moreDropdown} role="menu">
                  {/* Manage group */}
                  <div className={styles.dropdownGroup}>
                    <p className={styles.dropdownGroupLabel}>Manage</p>
                    {MORE_MANAGE.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        className={`${styles.dropdownItem} ${isActive(item.path) ? styles.dropdownItemActive : ''}`}
                        onClick={() => setMoreOpen(false)}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Store group */}
                  <div className={styles.dropdownGroup}>
                    <p className={styles.dropdownGroupLabel}>Store</p>
                    {MORE_STORE.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        className={`${styles.dropdownItem} ${isActive(item.path) ? styles.dropdownItemActive : ''}`}
                        onClick={() => setMoreOpen(false)}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Account group */}
                  <div className={styles.dropdownGroup}>
                    <p className={styles.dropdownGroupLabel}>Account</p>
                    {MORE_ACCOUNT.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        role="menuitem"
                        className={`${styles.dropdownItem} ${isActive(item.path) ? styles.dropdownItemActive : ''}`}
                        onClick={() => setMoreOpen(false)}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                    <button
                      role="menuitem"
                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ══ MAIN CONTENT — Outlet wrapped in per-route ErrorBoundary ══ */}
      <main className={styles.main}>
        <ErrorBoundary key={pathname} pageName={pathname.split('/')[1] || 'page'}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* ══ MOBILE BOTTOM PILL NAV ══ */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {MOBILE_PRIMARY.slice(0, 2).map((item) => {
          const b = badge(item.badge);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.pillNavItem} ${isActive(item.path) ? styles.pillNavItemActive : ''}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              {b !== undefined && <span className={styles.pillNavBadge}>{b}</span>}
              <span className={styles.pillNavIcon}>{item.icon}</span>
              <span className={styles.pillNavLabel}>{item.label}</span>
            </Link>
          );
        })}

        {/* Terminal FAB */}
        <Link to="/terminal" className={styles.terminalFab} aria-label="New seal">
          <Plus size={22} />
        </Link>

        {MOBILE_PRIMARY.slice(2, 4).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`${styles.pillNavItem} ${isActive(item.path) ? styles.pillNavItemActive : ''}`}
          >
            <span className={styles.pillNavIcon}>{item.icon}</span>
            <span className={styles.pillNavLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}