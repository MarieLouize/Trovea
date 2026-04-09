import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from '@/lib/motion';
import { 
  TrendingUp, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useArchiveStore } from '@/lib/store/archive.store';
import { formatCurrencyFull } from '@/lib/utils/format';
import { getDropsByMerchant } from '@/lib/api/drops.api';
import { getWindowsByMerchant, getBookingsByMerchant } from '@/lib/api/bookings.api';
import { getEnquiries } from '@/lib/api/enquiries.api';
import CustomDropdown from '@/components/primitives/CustomDropdown/CustomDropdown';
import type { Receipt, Product, Drop, AvailabilityWindow, Booking, Enquiry } from '@/lib/types';
import styles from './InsightsPage.module.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

// Computation Utilities
const getRevenue = (receipts: Receipt[], from: Date, to: Date): number =>
  receipts
    .filter(r => r.payment_status === 'paid' &&
      new Date(r.created_at) >= from &&
      new Date(r.created_at) <= to)
    .reduce((sum, r) => sum + r.total, 0);

const getSalesCount = (receipts: Receipt[], productId: string, from: Date, to: Date): number =>
  receipts
    .filter(r => new Date(r.created_at) >= from && new Date(r.created_at) <= to)
    .reduce((sum, r) =>
      sum + r.line_items.filter(li => li.product_id === productId).length, 0);

const getReturningBuyerRate = (receipts: Receipt[], from: Date, to: Date): number => {
  const paidInRange = receipts.filter(r => 
    r.payment_status === 'paid' && 
    new Date(r.created_at) >= from && 
    new Date(r.created_at) <= to
  );
  if (!paidInRange.length) return 0;
  const buyerCounts: Record<string, number> = {};
  paidInRange.forEach(r => {
    buyerCounts[r.buyer_name] = (buyerCounts[r.buyer_name] ?? 0) + 1;
  });
  const totalBuyers = Object.keys(buyerCounts).length;
  const returning = Object.values(buyerCounts).filter(c => c >= 2).length;
  return totalBuyers > 0 ? Math.round((returning / totalBuyers) * 100) : 0;
};

const getStagnantProducts = (products: Product[], receipts: Receipt[]): Product[] => {
  const cutoff = Date.now() - 14 * 86400000;
  return products.filter(p => {
    if (p.status !== 'live') return false;
    return !receipts.some(r =>
      new Date(r.created_at).getTime() > cutoff &&
      r.line_items.some(li => li.product_id === p.id)
    );
  });
};

type DateRange = 'today' | 'week' | 'month' | 'last30' | 'all';

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const navigate = useNavigate();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);
  const { receipts } = useLedgerStore();
  const { products } = useArchiveStore();

  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [isLoading, setIsLoading] = useState(true);

  // Live data state
  const [drops, setDrops] = useState<Drop[]>([]);
  const [windows, setWindows] = useState<AvailabilityWindow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  useEffect(() => {
    const loadLiveStats = async () => {
      const hasApi = !!import.meta.env.VITE_API_URL;
      if (!hasApi) {
        // Fallback to fixtures for dev
        const f = await import('@/lib/fixtures');
        setDrops(f.FIXTURE_DROPS);
        setWindows(f.FIXTURE_WINDOWS);
        setBookings(f.FIXTURE_BOOKINGS);
        setEnquiries(f.FIXTURE_ENQUIRIES);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [d, w, b, e] = await Promise.all([
          getDropsByMerchant(),
          getWindowsByMerchant(),
          getBookingsByMerchant(),
          st.isStudio ? getEnquiries() : Promise.resolve([])
        ]);
        setDrops(d);
        setWindows(w);
        setBookings(b);
        setEnquiries(e);
      } catch (err) {
        console.error('Failed to load insights data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLiveStats();
  }, [st.isStudio]);

  // ─── Date Computation ───
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);

    switch (dateRange) {
      case 'today': return { rangeStart: todayStart, rangeEnd: todayEnd };
      case 'week': {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
        return { rangeStart: d, rangeEnd: todayEnd };
      }
      case 'month': {
        const d = new Date(todayStart);
        d.setDate(1);
        return { rangeStart: d, rangeEnd: todayEnd };
      }
      case 'last30': {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - 30);
        return { rangeStart: d, rangeEnd: todayEnd };
      }
      case 'all': return { rangeStart: new Date(0), rangeEnd: todayEnd };
      default: return { rangeStart: new Date(0), rangeEnd: todayEnd };
    }
  }, [dateRange]);

  // ─── DATA DERIVATION ───

  const stats = useMemo(() => {
    const merchantId = merchant?.id || '';
    
    // Shared computations
    const rangeRevenue = getRevenue(receipts, rangeStart, rangeEnd);
    const returningRate = getReturningBuyerRate(receipts, rangeStart, rangeEnd);
    const merchantProducts = products.filter(p => p.merchant_id === merchantId);
    const stagnant = getStagnantProducts(merchantProducts, receipts);

    // Collector specific
    const lastDrop = drops.find(d => d.merchant_id === merchantId && d.status === 'completed');
    let dropSellThrough = 0;
    let dropReceipts: Receipt[] = [];
    if (lastDrop) {
      const dropStart = new Date(lastDrop.scheduled_at).getTime() - 3600000;
      const dropEnd = dropStart + 48 * 3600000;
      dropReceipts = receipts.filter(r => {
        const t = new Date(r.created_at).getTime();
        return t >= dropStart && t <= dropEnd;
      });
      dropSellThrough = lastDrop.product_ids.length > 0
        ? Math.round((dropReceipts.length / lastDrop.product_ids.length) * 100)
        : 0;
    }

    const topItems = [...merchantProducts]
      .filter(p => p.status === 'live')
      .map(p => ({ product: p, count: getSalesCount(receipts, p.id, rangeStart, rangeEnd) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Vendor specific
    const estimatedCap = merchantProducts.reduce((sum, p) => sum + (p.stock_level ?? 20), 0);
    const windowSellThroughs = windows
      .filter(w => w.status === 'closed' && w.merchant_id === merchantId)
      .map(w => ({
        label: w.label,
        orders: w.total_orders,
        sellThrough: estimatedCap > 0 ? Math.round((w.total_orders / estimatedCap) * 100) : 0,
      }))
      .slice(0, 4);
    const avgSellThrough = windowSellThroughs.length > 0
      ? Math.round(windowSellThroughs.reduce((s, w) => s + w.sellThrough, 0) / windowSellThroughs.length)
      : 0;

    // Host specific
    const bookingsInRange = bookings.filter(b => {
      const t = new Date(b.scheduled_at).getTime();
      return b.merchant_id === merchantId &&
        b.status !== 'cancelled' &&
        t >= rangeStart.getTime() &&
        t <= rangeEnd.getTime();
    });
    // Assuming 5 working days * 4 slots = 20 per week.
    const daysInRange = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000));
    const estimatedSlots = Math.round(daysInRange * (20/7));
    const fillRate = estimatedSlots > 0 ? Math.round((bookingsInRange.length / estimatedSlots) * 100) : 0;

    const revenueByService = (() => {
      const map: Record<string, { revenue: number; count: number }> = {};
      receipts
        .filter(r => r.payment_status === 'paid' && r.merchant_id === merchantId && new Date(r.created_at) >= rangeStart && new Date(r.created_at) <= rangeEnd)
        .forEach(r => {
          r.line_items.forEach(li => {
            if (!map[li.name]) map[li.name] = { revenue: 0, count: 0 };
            map[li.name].revenue += li.total_price;
            map[li.name].count += 1;
          });
        });
      return Object.entries(map)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
    })();

    // Creator specific
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const revenueToday = getRevenue(receipts, todayStart, todayEnd);
    const revenueYesterday = getRevenue(receipts, yesterdayStart, yesterdayEnd);
    const revenueTrend = revenueToday - revenueYesterday;

    const downloadsInRange = receipts.filter(r =>
      r.payment_status === 'paid' &&
      r.merchant_id === merchantId &&
      new Date(r.created_at) >= rangeStart &&
      new Date(r.created_at) <= rangeEnd
    ).length;

    const revenueByProduct = (() => {
      const map: Record<string, { revenue: number; downloads: number; productName: string }> = {};
      receipts
        .filter(r => r.payment_status === 'paid' && r.merchant_id === merchantId && new Date(r.created_at) >= rangeStart && new Date(r.created_at) <= rangeEnd)
        .forEach(r => {
          r.line_items.forEach(li => {
            const key = li.product_id ?? li.name;
            if (!map[key]) map[key] = { revenue: 0, downloads: 0, productName: li.name };
            map[key].revenue += li.total_price;
            map[key].downloads += 1;
          });
        });
      return Object.values(map).sort((a, b) => b.revenue - a.revenue);
    })();

    // Studio specific
    const studioEnquiries = enquiries.filter(e => e.merchant_id === merchantId);
    const pipelineValue = studioEnquiries
      .filter(e => !['declined', 'completed'].includes(e.status))
      .reduce((sum, e) => sum + (e.package_value ?? 0), 0);

    const pendingDeposits = studioEnquiries.filter(e =>
      e.status === 'active_project' &&
      (e.deposit_paid ?? 0) < (e.package_value ?? 0)
    );
    const pendingDepositValue = pendingDeposits.reduce((sum, e) => sum + ((e.package_value ?? 0) - (e.deposit_paid ?? 0)), 0);

    const responded = studioEnquiries.filter(e => e.response_time_hours !== null);
    const avgResponse = responded.length ? Math.round(responded.reduce((sum, e) => sum + (e.response_time_hours ?? 0), 0) / responded.length) : 18;

    return {
      rangeRevenue,
      returningRate,
      stagnant,
      lastDrop,
      dropSellThrough,
      dropReceipts,
      topItems,
      windowSellThroughs,
      avgSellThrough,
      fillRate,
      revenueByService,
      revenueToday,
      revenueTrend,
      downloadsInRange,
      revenueByProduct,
      pipelineValue,
      pendingDeposits,
      pendingDepositValue,
      avgResponse
    };
  }, [receipts, products, merchant?.id, rangeStart, rangeEnd, drops, windows, bookings, enquiries]);

  if (isLoading) {
    return (
      <div className={styles.root}>
        <div className={styles.pageHeader}>
          <div className="skeleton-text" style={{ width: '120px', height: '24px' }} />
          <div className="skeleton-text" style={{ width: '240px', height: '48px', marginTop: '12px' }} />
        </div>
        <div className={styles.insightList}>
          {[1,2,3].map(i => (
            <div key={i} className={styles.insightCard} style={{ height: '160px' }}>
              <div className="skeleton" style={{ width: '80px', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton-text" style={{ width: '90%', height: '24px', marginTop: '16px' }} />
              <div className="skeleton-text" style={{ width: '60%', height: '14px', marginTop: '12px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── RENDERERS ───

  return (
    <div className={styles.root}>
      {/* Header */}
      <m.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.headerTop}>
          <div className={styles.headerText}>
            <span className={styles.eyebrow}>Insights</span>
            <h1 className={styles.headline}>Your numbers.</h1>
          </div>
          <div className={styles.rangePicker}>
            <CustomDropdown 
              options={DATE_RANGE_OPTIONS} 
              value={dateRange} 
              onChange={(v) => setDateRange(v as DateRange)} 
            />
          </div>
        </div>
        {st.isStudio && (
          <div className={styles.avgResponse}>
            Avg response: {stats.avgResponse}h this month
          </div>
        )}
      </m.div>

      <m.div 
        className={styles.insightList}
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Collector */}
        {st.isCollector && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Drop Performance</span>
              {stats.lastDrop ? (
                <>
                  <span className={styles.insightLead}>Your last drop sold {stats.dropReceipts.length}/{stats.lastDrop.product_ids.length} items ({stats.dropSellThrough}%) in 48h.</span>
                  <div className={styles.insightData}>
                    <div className={styles.dataLine}>{stats.lastDrop.label}</div>
                    {stats.topItems.length > 0 && (
                      <div className={styles.dataLine}>Fastest sellers: {stats.topItems.map(i => i.product.name).join(', ')}</div>
                    )}
                  </div>
                </>
              ) : (
                <span className={styles.insightLead}>No completed drops found.</span>
              )}
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Top Items</span>
              {stats.topItems.length > 0 ? (
                <div className={styles.flaggedItems} style={{ borderTop: 'none', paddingTop: 0 }}>
                  {stats.topItems.map(({ product, count }) => (
                    <div key={product.id} className={styles.flaggedItem}>
                      <div className={styles.flaggedItemRow}>
                        <span className={styles.flaggedItemName}>{product.name}</span>
                        <span className={styles.flaggedItemProblem}>{count} sales in range</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className={styles.insightLead}>No sales in this range.</span>
              )}
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Inventory Health</span>
              <span className={styles.insightLead}>
                {products.filter(p => p.status === 'live' && p.merchant_id === merchant?.id).length} live items · {stats.returningRate}% returning buyer rate · {stats.stagnant.length} stagnant
              </span>
              <div className={styles.insightData}>
                <button className={styles.actionLink} style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }} onClick={() => navigate('/archive?tab=stagnant')}>
                  View stagnant items <ArrowRight size={12} />
                </button>
              </div>
            </m.div>
          </>
        )}

        {/* Vendor */}
        {st.isVendor && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Window Sell-Through</span>
              <span className={styles.insightLead}>Your last {stats.windowSellThroughs.length} windows averaged {stats.avgSellThrough}% sell-through.</span>
              <div className={styles.insightData}>
                {stats.windowSellThroughs.map((w, i) => (
                  <div key={i} className={styles.dataLine}>{w.label}: {w.orders} orders ({w.sellThrough}%)</div>
                ))}
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Revenue — {DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}</span>
              <span className={styles.insightLead}>{formatCurrencyFull(stats.rangeRevenue)}</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>{receipts.filter(r => r.payment_status === 'paid' && r.merchant_id === merchant?.id && new Date(r.created_at) >= rangeStart && new Date(r.created_at) <= rangeEnd).length} paid receipts</div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Consistently Unsold</span>
              <div className={styles.flaggedItems}>
                <div className={styles.flaggedItem}>
                  {stats.stagnant.length > 0 ? (
                    <>
                      <div className={styles.flaggedItemRow}>
                        <span className={styles.flaggedItemName}>{stats.stagnant[0].name}</span>
                        <span className={styles.flaggedItemProblem}>0 sales in 14 days</span>
                      </div>
                      <div className={styles.flaggedActions}>
                        <button className={styles.actionLink} onClick={() => navigate(`/archive?action=editCap&product=${stats.stagnant[0].id}`)}>
                          Review cap
                        </button>
                        <button className={styles.actionLink} style={{ color: 'var(--color-fg-ghost)' }} onClick={() => navigate('/archive')}>
                          Remove from menu
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.allClear}>
                      <CheckCircle2 size={16} /> All menu items moving well.
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          </>
        )}

        {/* Host */}
        {st.isHost && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Schedule Efficiency</span>
              <span className={styles.insightLead}>{DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}: {stats.fillRate}% fill rate</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>Revenue: {formatCurrencyFull(stats.rangeRevenue)}</div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Buyer Loyalty</span>
              <div className={styles.allClear}>
                <TrendingUp size={16} /> {stats.returningRate}% of clients booked 2+ times in this range.
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Revenue by Service</span>
              <table className={styles.insightTable}>
                <tbody>
                  {stats.revenueByService.map((s, i) => (
                    <tr key={i}>
                      <td className={styles.bold}>{s.name}</td>
                      <td>{formatCurrencyFull(s.revenue)}</td>
                      <td>{s.count} bookings</td>
                    </tr>
                  ))}
                  {stats.revenueByService.length === 0 && (
                    <tr><td colSpan={3}>No services booked in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </m.div>
          </>
        )}

        {/* Digital Creator */}
        {st.isDigital && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Revenue Trend — {DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}</span>
              <span className={styles.insightLead}>{formatCurrencyFull(stats.rangeRevenue)} total · {stats.downloadsInRange} downloads</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>
                  Today: {formatCurrencyFull(stats.revenueToday)} 
                  <span style={{ color: stats.revenueTrend >= 0 ? 'var(--color-success)' : 'var(--color-accent)', marginLeft: 8 }}>
                    {stats.revenueTrend >= 0 ? '+' : ''}{formatCurrencyFull(stats.revenueTrend)} vs yesterday
                  </span>
                </div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Product Health</span>
              <div className={styles.flaggedItems}>
                {stats.stagnant.length > 0 ? (
                  <div className={styles.flaggedItem}>
                    <div className={styles.flaggedItemRow}>
                      <span className={styles.flaggedItemName}>{stats.stagnant[0].name}</span>
                      <span className={styles.flaggedItemProblem}>⚠ 0 downloads in 14 days</span>
                    </div>
                    <div className={styles.flaggedActions}>
                      <button className={styles.actionLink} onClick={() => navigate(`/catalogue?action=checkLink&product=${stats.stagnant[0].id}`)}>
                        Check delivery link
                      </button>
                      <button className={styles.actionLink} onClick={() => navigate(`/catalogue?action=feature&product=${stats.stagnant[0].id}`)}>
                        Feature this product
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.allClear}>
                    <CheckCircle2 size={16} /> All products moving well.
                  </div>
                )}
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Earnings Split</span>
              <table className={styles.insightTable}>
                <tbody>
                  {stats.revenueByProduct.slice(0, 5).map((p, i) => (
                    <tr key={i}>
                      <td className={styles.bold}>{p.productName}</td>
                      <td>{formatCurrencyFull(p.revenue)}</td>
                      <td>{p.downloads} downloads</td>
                    </tr>
                  ))}
                  {stats.revenueByProduct.length === 0 && (
                    <tr><td colSpan={3}>No downloads in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </m.div>
          </>
        )}

        {/* Studio */}
        {st.isStudio && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Pipeline Value</span>
              <span className={styles.insightLead}>{formatCurrencyFull(stats.pipelineValue)} in active projects</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>{stats.pendingDeposits.length} projects pending deposit ({formatCurrencyFull(stats.pendingDepositValue)} outstanding)</div>
              </div>
              <button className={styles.actionLink} onClick={() => navigate('/ledger?tab=deposits')}>
                View outstanding deposits →
              </button>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Revenue — {DATE_RANGE_OPTIONS.find(o => o.value === dateRange)?.label}</span>
              <span className={styles.insightLead}>{formatCurrencyFull(stats.rangeRevenue)}</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>{stats.returningRate}% returning client rate</div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Response Performance</span>
              <span className={styles.insightLead}>Avg. response time: {stats.avgResponse}h overall</span>
              <div className={styles.flaggedItems}>
                {stats.pendingDeposits.length > 0 ? (
                  <div className={styles.flaggedItem}>
                    <div className={styles.flaggedItemRow}>
                      <span className={styles.flaggedItemName}>Pending: {stats.pendingDeposits[0].client_name}</span>
                      <span className={styles.flaggedItemProblem}>Awaiting deposit</span>
                    </div>
                    <button className={styles.actionLink} onClick={() => navigate(`/bookings?enquiry=${stats.pendingDeposits[0].id}`)}>
                      Follow up on WhatsApp →
                    </button>
                  </div>
                ) : (
                  <div className={styles.allClear}>
                    <CheckCircle2 size={16} /> No pending project actions.
                  </div>
                )}
              </div>
            </m.div>
          </>
        )}
      </m.div>
    </div>
  );
}
