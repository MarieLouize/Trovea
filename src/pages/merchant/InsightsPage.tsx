import { useState } from 'react';
import { m } from '@/lib/motion';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import type { StoreTypeContext } from '@/lib/hooks/use-store-type';
import { formatCurrencyFull, formatRelativeDate } from '@/lib/utils/format';
import {
  FIXTURE_WINDOWS,
  FIXTURE_BOOKINGS,
  FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_PRODUCTS,
} from '@/lib/fixtures';
import styles from './InsightsPage.module.css';

type Period = '7d' | '30d' | '90d' | 'all';

interface TypeCardData {
  title: string;
  value: string;
  note: string;
}

// Derive simple analytics from fixture receipts
function useInsights(period: Period) {
  const { receipts } = useLedgerStore();
  const { products } = useArchiveStore();

  const cutoff = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    all: 9999,
  }[period];

  const cutoffDate = new Date(Date.now() - cutoff * 24 * 60 * 60 * 1000);

  const filtered = receipts.filter(
    (r) => r.payment_status === 'paid' && new Date(r.created_at) >= cutoffDate
  );

  const revenue = filtered.reduce((sum, r) => sum + r.total, 0);
  const units = filtered.reduce(
    (sum, r) => sum + r.line_items.reduce((s, li) => s + li.quantity, 0),
    0
  );
  const orders = filtered.length;
  const aov = orders > 0 ? Math.round(revenue / orders) : 0;

  // Top products
  const productRevMap: Record<string, { name: string; units: number; revenue: number }> = {};
  for (const r of filtered) {
    for (const li of r.line_items) {
      const key = li.product_id ?? li.name;
      if (!productRevMap[key]) {
        productRevMap[key] = { name: li.name, units: 0, revenue: 0 };
      }
      productRevMap[key].units += li.quantity;
      productRevMap[key].revenue += li.total_price;
    }
  }
  const topProducts = Object.values(productRevMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const maxRevenue = topProducts[0]?.revenue ?? 1;

  // Weekly bars (last 7 week-days)
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('en-NG', { weekday: 'short' }).slice(0, 2);
    const dayRevenue = filtered
      .filter((r) => {
        const rd = new Date(r.created_at);
        return (
          rd.getDate() === d.getDate() &&
          rd.getMonth() === d.getMonth() &&
          rd.getFullYear() === d.getFullYear()
        );
      })
      .reduce((sum, r) => sum + r.total, 0);
    return { label, value: dayRevenue };
  });

  const maxBar = Math.max(...weekBars.map((b) => b.value), 1);

  // Collection breakdown for donut
  const collectionRevMap: Record<string, number> = {};
  for (const r of filtered) {
    for (const li of r.line_items) {
      const p = products.find((prod) => prod.id === li.product_id);
      const colId = p?.collection_id ?? 'uncollected';
      collectionRevMap[colId] = (collectionRevMap[colId] ?? 0) + li.total_price;
    }
  }

  const COLLECTION_NAMES: Record<string, string> = {
    'col-001': 'Dresses',
    'col-002': 'Tops & Sets',
    'col-003': 'Bags',
    uncollected: 'Other',
  };

  const COLLECTION_COLORS = ['#390007', '#C9A84C', '#5C0010', '#8B5E3C', '#4A3728'];

  const collectionBreakdown = Object.entries(collectionRevMap)
    .sort(([, a], [, b]) => b - a)
    .map(([id, rev], i) => ({
      id,
      name: COLLECTION_NAMES[id] ?? id,
      revenue: rev,
      pct: revenue > 0 ? Math.round((rev / revenue) * 100) : 0,
      color: COLLECTION_COLORS[i % COLLECTION_COLORS.length],
    }));

  // Recent activity (last 8 receipts)
  const recentActivity = [...receipts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return { revenue, units, orders, aov, topProducts, maxRevenue, weekBars, maxBar, collectionBreakdown, recentActivity, products };
}

// Per-type insight cards
function computeTypeCards(st: StoreTypeContext, archiveProducts: { status: string; stock_level: number | null }[]): TypeCardData[] {
  if (st.isCollector) {
    const liveProducts = archiveProducts.filter(p => p.status === 'live');
    const inStock = liveProducts.filter(p => (p.stock_level ?? 0) > 0).length;
    const healthPct = liveProducts.length > 0 ? Math.round((inStock / liveProducts.length) * 100) : 0;
    return [
      { title: 'Top Category', value: 'Dresses', note: 'Highest revenue category' },
      { title: 'Inventory Health', value: `${healthPct}%`, note: `${inStock} of ${liveProducts.length} items in stock` },
    ];
  }

  if (st.isVendor) {
    const openWindows = FIXTURE_WINDOWS.filter(w => w.status === 'open').length;
    const topItem = [...FIXTURE_VENDOR_PRODUCTS].sort((a, b) => b.price - a.price)[0];
    return [
      { title: 'Open Windows', value: String(openWindows), note: 'Active service windows today' },
      { title: 'Top Menu Item', value: topItem?.name ?? '—', note: formatCurrencyFull(topItem?.price ?? 0) },
    ];
  }

  if (st.isHost) {
    const hostBookings = FIXTURE_BOOKINGS.filter(b => b.merchant_id === 'merchant-003');
    const active = hostBookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').length;
    const confirmed = hostBookings.filter(b => b.status === 'confirmed').length;
    const rate = active > 0 ? Math.round((confirmed / active) * 100) : 0;
    const upcoming = hostBookings.filter(b => new Date(b.scheduled_at) > new Date() && b.status !== 'cancelled').length;
    return [
      { title: 'Booking Rate', value: `${rate}%`, note: `${confirmed} confirmed of ${active} active` },
      { title: 'Upcoming Slots', value: String(upcoming), note: 'Scheduled appointments' },
    ];
  }

  if (st.isDigital) {
    const active = FIXTURE_DIGITAL_PRODUCTS.filter(p => p.status !== 'hidden').length;
    const withUrl = FIXTURE_DIGITAL_PRODUCTS.filter(p => p.delivery_url).length;
    return [
      { title: 'Active Products', value: String(active), note: `of ${FIXTURE_DIGITAL_PRODUCTS.length} total` },
      { title: 'Delivery Health', value: `${withUrl} / ${FIXTURE_DIGITAL_PRODUCTS.length}`, note: 'Products with delivery URL' },
    ];
  }

  if (st.isStudio) {
    const studioBookings = FIXTURE_BOOKINGS.filter(b => b.merchant_id === 'merchant-005');
    const fixedCount = FIXTURE_STUDIO_PRODUCTS.filter(p => p.price_type === 'fixed').length;
    const customCount = FIXTURE_STUDIO_PRODUCTS.filter(p => p.price_type === 'custom').length;
    return [
      { title: 'Enquiry Pipeline', value: String(studioBookings.length), note: 'Active project enquiries' },
      { title: 'Package Mix', value: `${fixedCount}F · ${customCount}C`, note: `${FIXTURE_STUDIO_PRODUCTS.length} packages total` },
    ];
  }

  return [];
}

// Simple donut SVG
function DonutChart({ data }: { data: { pct: number; color: string; name: string }[] }) {
  const r = 52;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = data.map((d) => {
    const dash = (d.pct / 100) * circumference;
    const gap = circumference - dash;
    const seg = { ...d, dash, gap, offset };
    offset += dash;
    return seg;
  });

  return (
    <svg width={120} height={120} className={styles.donutSvg} viewBox="0 0 120 120" aria-hidden="true">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={14} />
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={14}
          strokeDasharray={`${seg.dash} ${seg.gap}`}
          strokeDashoffset={circumference - seg.offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
        />
      ))}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--color-fg)" fontSize={11} fontFamily="var(--font-mono)">
        Revenue
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--color-fg-ghost)" fontSize={9} fontFamily="var(--font-mono)">
        by category
      </text>
    </svg>
  );
}

const containerVariants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function InsightsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const st = useStoreType();
  const {
    revenue, units, orders, aov,
    topProducts, maxRevenue,
    weekBars, maxBar,
    collectionBreakdown,
    recentActivity,
    products,
  } = useInsights(period);

  const typeCards = computeTypeCards(st, products);

  const periods: { key: Period; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'all', label: 'All Time' },
  ];

  // Adaptive KPI labels
  const ordersLabel =
    st.isVendor  ? 'Pre-orders' :
    st.isHost    ? 'Bookings'   :
    st.isDigital ? 'Downloads'  :
    st.isStudio  ? 'Projects'   :
    'Orders';

  const kpis = [
    { label: 'Revenue',    value: formatCurrencyFull(revenue), delta: '+14%', positive: true,  gold: false },
    { label: ordersLabel,  value: String(orders),              delta: '+3',   positive: true,  gold: false },
    { label: 'Units Sold', value: String(units),               delta: '+8',   positive: true,  gold: true  },
    { label: 'Avg. Order', value: formatCurrencyFull(aov),     delta: '—',    positive: false, gold: true  },
  ];

  // Adaptive activity subtitle
  const activitySubtitle =
    st.isVendor  ? 'All pre-orders' :
    st.isHost    ? 'All bookings'   :
    st.isDigital ? 'All purchases'  :
    st.isStudio  ? 'All projects'   :
    'All orders';

  return (
    <div className={styles.root}>
      {/* Header */}
      <m.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className={styles.eyebrow}>Insights</span>
        <h1 className={styles.headline}>Your numbers.</h1>
      </m.div>

      {/* Period selector */}
      <m.div
        className={styles.periodRow}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        {periods.map((p) => (
          <button
            key={p.key}
            className={`${styles.periodBtn} ${period === p.key ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod(p.key)}
            aria-pressed={period === p.key}
          >
            {p.label}
          </button>
        ))}
      </m.div>

      {/* KPI Grid */}
      <m.div
        className={styles.kpiGrid}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {kpis.map((kpi, i) => (
          <m.div key={i} className={styles.kpiCard} variants={itemVariants}>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={`${styles.kpiDelta} ${kpi.positive ? styles.deltaPositive : styles.deltaNeutral}`}>
              {kpi.positive && <ArrowUpRight size={10} aria-hidden="true" />}
              {kpi.delta}
            </span>
            <div className={`${styles.kpiAccent} ${kpi.gold ? styles.kpiAccentGold : ''}`} aria-hidden="true" />
          </m.div>
        ))}
      </m.div>

      {/* Charts row */}
      <m.div
        className={styles.chartsRow}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        {/* Revenue bar chart */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Revenue</h2>
          <span className={styles.chartSubtitle}>Daily — Last 7 days</span>
          <div className={styles.barChart} aria-label="Revenue bar chart, last 7 days">
            {weekBars.map((bar, i) => (
              <div key={i} className={styles.barGroup}>
                <div
                  className={styles.barOuter}
                  style={{ height: `${maxBar > 0 ? Math.round((bar.value / maxBar) * 120) : 4}px` }}
                >
                  <m.div
                    className={styles.barFill}
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: [0.34, 1.2, 0.64, 1] }}
                    aria-label={`${bar.label}: ${formatCurrencyFull(bar.value)}`}
                  />
                </div>
                <span className={styles.barLabel}>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Collection donut */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Breakdown</h2>
          <span className={styles.chartSubtitle}>Revenue by category</span>
          {collectionBreakdown.length > 0 ? (
            <div className={styles.donutWrap}>
              <DonutChart data={collectionBreakdown} />
              <div className={styles.donutLegend}>
                {collectionBreakdown.map((c) => (
                  <div key={c.id} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ background: c.color }} aria-hidden="true" />
                    <span className={styles.legendLabel}>{c.name}</span>
                    <span className={styles.legendValue}>{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyBody}>No paid sales in this period.</p>
            </div>
          )}
        </div>
      </m.div>

      {/* Type-specific insight cards */}
      {typeCards.length > 0 && (
        <m.div
          className={styles.typeCardRow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
        >
          {typeCards.map((card, i) => (
            <div key={i} className={styles.typeCard}>
              <span className={styles.typeCardLabel}>{card.title}</span>
              <span className={styles.typeCardValue}>{card.value}</span>
              <span className={styles.typeCardNote}>{card.note}</span>
            </div>
          ))}
        </m.div>
      )}

      {/* Top Products */}
      <m.div
        className={styles.tableCard}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
      >
        <h2 className={styles.chartTitle} style={{ position: 'relative', zIndex: 1 }}>
          Top {st.itemsLabel}
        </h2>
        <span className={styles.chartSubtitle} style={{ position: 'relative', zIndex: 1 }}>
          By revenue — {period === 'all' ? 'All Time' : `Last ${period}`}
        </span>

        {topProducts.length > 0 ? (
          <>
            <div className={styles.tableHeader}>
              <span className={styles.tableHeaderCell}>#</span>
              <span className={styles.tableHeaderCell}>Item</span>
              <span className={styles.tableHeaderCell}>Units</span>
              <span className={styles.tableHeaderCell}>Revenue</span>
              <span className={styles.tableHeaderCell}></span>
            </div>
            {topProducts.map((p, i) => (
              <m.div
                key={p.name}
                className={styles.tableRow}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.35 + i * 0.06 }}
              >
                <span className={styles.tableRank}>{i + 1}</span>
                <span className={styles.tableName}>{p.name}</span>
                <span className={styles.tableUnits}>{p.units}</span>
                <span className={styles.tableRevenue}>{formatCurrencyFull(p.revenue)}</span>
                <div className={styles.tableBar}>
                  <m.div
                    className={styles.tableBarFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((p.revenue / maxRevenue) * 100)}%` }}
                    transition={{ duration: 0.6, delay: 0.4 + i * 0.07, ease: [0.34, 1.2, 0.64, 1] }}
                  />
                </div>
              </m.div>
            ))}
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><TrendingUp size={40} strokeWidth={1} /></div>
            <p className={styles.emptyTitle}>No sales data yet</p>
            <p className={styles.emptyBody}>Paid orders will appear here.</p>
          </div>
        )}
      </m.div>

      {/* Activity feed */}
      <m.div
        className={styles.activityCard}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
      >
        <h2 className={styles.chartTitle} style={{ position: 'relative', zIndex: 1, marginBottom: 'var(--space-1)' }}>
          Recent Activity
        </h2>
        <span className={styles.chartSubtitle}>{activitySubtitle}</span>
        <div className={styles.activityFeed}>
          {recentActivity.map((r) => {
            const dotClass =
              r.payment_status === 'paid'
                ? r.shipment_status === 'shipped' || r.shipment_status === 'received'
                  ? styles.activityDotShipped
                  : styles.activityDotPaid
                : styles.activityDotPending;
            return (
              <div key={r.id} className={styles.activityItem}>
                <div className={`${styles.activityDot} ${dotClass}`} aria-hidden="true" />
                <div className={styles.activityBody}>
                  <div className={styles.activityText}>{r.buyer_name} — {r.line_items[0]?.name}</div>
                  <div className={styles.activityTime}>{formatRelativeDate(r.created_at)}</div>
                </div>
                <div className={styles.activityAmount}>{formatCurrencyFull(r.total)}</div>
              </div>
            );
          })}
        </div>
      </m.div>
    </div>
  );
}
