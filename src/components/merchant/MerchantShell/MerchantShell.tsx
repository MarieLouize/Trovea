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
  Calendar,
  BookMarked,
} from 'lucide-react';
import ErrorBoundary from '@/components/primitives/ErrorBoundary/ErrorBoundary';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore, DEV_MERCHANTS } from '@/lib/store/merchant.store';
import styles from './MerchantShell.module.css';

// ─── Static nav groups (not store-type-dependent) ──────────────────────────

const MANAGE_NAV = [
  { path: '/dispatch',  label: 'Dispatch',  icon: <Package size={16} /> },
  { path: '/insights',  label: 'Insights',  icon: <BarChart2 size={16} /> },
];

const ACCOUNT_NAV = [
  { path: '/notifications', label: 'Notifications', icon: <Bell size={16} />, badge: true },
  { path: '/settings',      label: 'Settings',       icon: <Settings size={16} /> },
];

// More dropdown groups
const MORE_MANAGE = [
  { path: '/dispatch', label: 'Dispatch', icon: <Package size={14} /> },
  { path: '/insights', label: 'Insights', icon: <BarChart2 size={14} /> },
];
// MORE_STORE is built dynamically inside the component (requires merchant handle)
const MORE_ACCOUNT = [
  { path: '/settings', label: 'Settings', icon: <Settings size={14} /> },
];

// Dev store type labels for the switcher panel
const DEV_STORE_TYPES = [
  { label: 'Collector', type: 'collector', merchant: 'Tola\'s Archive' },
  { label: 'Vendor',    type: 'vendor',    merchant: 'Tobi Eats' },
  { label: 'Host',      type: 'host',      merchant: 'Chisom Beauty' },
  { label: 'Digital',   type: 'digital_creator', merchant: 'Femi Creates' },
  { label: 'Studio',    type: 'studio',    merchant: 'Ngozi Studio' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export default function MerchantShell() {
  const { pathname } = useLocation();
  const { receipts } = useLedgerStore();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);
  const setMerchant = useMerchantStore((s) => s.setMerchant);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isDev = import.meta.env.DEV;

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

  const storeHandle = merchant.handle;

  const moreStore = [
    { path: '/receipts', label: 'Receipts', icon: <Receipt size={14} /> },
    { path: `/store/${storeHandle}/customize`, label: 'Customize', icon: <Palette size={14} /> },
    { path: `/store/${storeHandle}`, label: 'View Store', icon: <ExternalLink size={14} /> },
  ];

  const isActive = (path: string) => {
    if (path === `/store/${storeHandle}`) return pathname === `/store/${storeHandle}`;
    if (path === `/store/${storeHandle}/customize`) return pathname.includes('/customize');
    return pathname.startsWith(path);
  };

  const badge = (hasBadge?: boolean) =>
    hasBadge && pendingCount > 0 ? pendingCount : undefined;

  const coreNavItems = [
    { path: '/dashboard', label: 'Home',   icon: <LayoutDashboard size={16} /> },
    { path: '/ledger',    label: 'Ledger', icon: <BookOpen size={16} />, badge: true },
    { path: '/receipts',  label: 'Receipts', icon: <Receipt size={16} /> },
    // Archive vs Catalogue — Digital Creator gets /catalogue, everyone else gets /archive
    ...(!st.isDigital
      ? [{ path: '/archive', label: st.archiveLabel, icon: <Archive size={16} /> }]
      : [{ path: '/catalogue', label: 'Catalogue', icon: <BookOpen size={16} /> }]
    ),
    // Schedule — Vendor + Host only
    ...(st.isVendor || st.isHost
      ? [{ path: '/schedule', label: 'Schedule', icon: <Calendar size={16} /> }]
      : []
    ),
    // Bookings — Host + Studio only
    ...(st.isHost || st.isStudio
      ? [{ path: '/bookings', label: 'Bookings', icon: <BookMarked size={16} /> }]
      : []
    ),
  ];

  const storeNavItems = [
    { path: `/store/${storeHandle}`, label: 'View Store', icon: <Store size={16} /> },
    { path: `/store/${storeHandle}/customize`, label: 'Customize', icon: <Palette size={16} /> },
  ];

  const mobileNavItems = [
    { path: '/dashboard', label: 'Home',    icon: <LayoutDashboard size={18} /> },
    { path: '/ledger',    label: 'Ledger',  icon: <BookOpen size={18} />, badge: true },
    { 
      path: st.isDigital ? '/catalogue' : '/archive', 
      label: st.isDigital ? 'Catalogue' : st.archiveLabel, 
      icon: st.isDigital ? <BookOpen size={18} /> : <Archive size={18} /> 
    },
    { path: `/store/${storeHandle}`, label: 'Store', icon: <Store size={18} /> },
  ];

  return (
    <div className={styles.shell}>

      {/* ══ DESKTOP SIDEBAR ══ */}
      <nav className={styles.sidebar} aria-label="Merchant navigation">
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logo}>
            Trove<span className={styles.logoApostrophe}>'</span>a
          </div>
          <span className={styles.storeName}>{merchant.store_name}</span>
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
              {coreNavItems.map((item) => {
                const b = badge((item as { badge?: boolean }).badge);
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
              {storeNavItems.map((item) => (
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

        {/* Dev-only type switcher */}
        {isDev && (
          <div className={styles.devSwitcher}>
            <p className={styles.devSwitcherLabel}>DEV — store_type: {st.type}</p>
            <div className={styles.devSwitcherItems}>
              {DEV_STORE_TYPES.map((entry) => (
                <button
                  key={entry.type}
                  className={`${styles.devSwitcherBtn} ${st.type === entry.type ? styles.devSwitcherBtnActive : ''}`}
                  onClick={() => {
                    const m = DEV_MERCHANTS.find((d) => d.store_type === entry.type);
                    if (m) setMerchant(m);
                  }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        )}
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
                    {moreStore.map((item) => (
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

                  {/* Dev type switcher */}
                  {isDev && (
                    <div className={styles.dropdownGroup}>
                      <p className={styles.dropdownGroupLabel}>Dev — {st.type}</p>
                      <div className={styles.devSwitcherItems}>
                        {DEV_STORE_TYPES.map((entry) => (
                          <button
                            key={entry.type}
                            className={`${styles.devSwitcherBtn} ${st.type === entry.type ? styles.devSwitcherBtnActive : ''}`}
                            onClick={() => {
                              const m = DEV_MERCHANTS.find((d) => d.store_type === entry.type);
                              if (m) setMerchant(m);
                              setMoreOpen(false);
                            }}
                          >
                            {entry.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
        {mobileNavItems.slice(0, 2).map((item) => {
          const b = badge((item as { badge?: boolean }).badge);
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

        {mobileNavItems.slice(2, 4).map((item) => (
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
