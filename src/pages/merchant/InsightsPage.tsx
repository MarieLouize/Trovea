import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from '@/lib/motion';
import { 
  TrendingUp, ArrowRight, CheckCircle2, AlertCircle, 
  Package, Clock, Zap, Calendar, MessageSquare
} from 'lucide-react';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { formatCurrencyFull } from '@/lib/utils/format';
import {
  FIXTURE_RECEIPTS,
  FIXTURE_DROPS,
  FIXTURE_WINDOWS,
  FIXTURE_BOOKINGS,
  FIXTURE_ENQUIRIES,
  FIXTURE_PRODUCTS,
  FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_PRODUCTS,
} from '@/lib/fixtures';
import styles from './InsightsPage.module.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const containerVariants = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const navigate = useNavigate();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);

  // ─── DATA DERIVATION ───

  const stats = useMemo(() => {
    const merchantReceipts = FIXTURE_RECEIPTS.filter(r => r.merchant_id === merchant.id);
    const paidReceipts = merchantReceipts.filter(r => r.payment_status === 'paid');
    
    // Collector: Last drop performance
    const lastDrop = FIXTURE_DROPS.find(d => d.merchant_id === merchant.id && d.status === 'completed');
    const stagnantItems = FIXTURE_PRODUCTS.filter(p => 
      p.merchant_id === merchant.id && 
      p.status === 'live' && 
      !paidReceipts.some(r => r.line_items.some(li => li.product_id === p.id))
    ).slice(0, 1);

    // Vendor: Window sell-through
    const closedWindows = FIXTURE_WINDOWS.filter(w => w.merchant_id === merchant.id && w.status === 'closed');
    
    // Host: Schedule efficiency
    const weekBookings = FIXTURE_BOOKINGS.filter(b => b.merchant_id === merchant.id);
    const confirmedCount = weekBookings.filter(b => b.status === 'confirmed').length;

    // Creator: Revenue trend
    const creatorRevenue = paidReceipts.reduce((sum, r) => sum + r.total, 0);
    const downloadCount = paidReceipts.reduce((sum, r) => sum + r.line_items.length, 0);

    // Studio: Pipeline value
    const activeProjects = FIXTURE_ENQUIRIES.filter(e => e.merchant_id === merchant.id && e.status === 'active_project');
    const pipelineValue = activeProjects.reduce((sum, e) => sum + (e.package_value ?? 0), 0);
    const pendingDepositValue = activeProjects.reduce((sum, e) => sum + ((e.package_value ?? 0) - (e.deposit_paid ?? 0)), 0);

    // Studio: Response time
    const withResponse = FIXTURE_ENQUIRIES.filter(e => e.merchant_id === merchant.id && e.response_time_hours !== null);
    const avgResponse = withResponse.length ? Math.round(withResponse.reduce((sum, e) => sum + (e.response_time_hours ?? 0), 0) / withResponse.length) : 18;

    return {
      paidReceipts,
      lastDrop,
      stagnantItems,
      closedWindows,
      confirmedCount,
      creatorRevenue,
      downloadCount,
      activeProjects,
      pipelineValue,
      pendingDepositValue,
      avgResponse
    };
  }, [merchant.id]);

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
        <div>
          <span className={styles.eyebrow}>Insights</span>
          <h1 className={styles.headline}>Your numbers.</h1>
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
        {/* ═══════════════════════════════════════════════════════════════════
            COLLECTOR INSIGHTS
        ═══════════════════════════════════════════════════════════════════ */}
        {st.isCollector && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Drop Performance</span>
              <span className={styles.insightLead}>Your last drop sold 14/18 items (78%) in 2 hours.</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>Drop 03 — Ankara Revival</div>
                <div className={styles.dataLine}>Fastest sellers: Ankara Wrap Dress, Raffia Mini Tote</div>
                <div className={styles.dataLine}>Slowest: 4 items unsold at close</div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>High Interest, No Sale</span>
              <span className={styles.insightLead}>4 items have been clicked but not converted recently.</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>These may benefit from a price review or drop staging.</div>
              </div>
              <div className={styles.flaggedItems}>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemRow}>
                    <span className={styles.flaggedItemName}>Printed Adire Slip Dress</span>
                    <span className={styles.flaggedItemProblem}>4 views, 0 sales</span>
                  </div>
                  <div className={styles.flaggedActions}>
                    <button className={styles.actionLink} onClick={() => navigate('/archive?action=stageForDrop&product=product-003')}>
                      <Package size={10} /> Feature in next drop
                    </button>
                    <button className={styles.actionLink} onClick={() => navigate('/archive?action=editPrice&product=product-003')}>
                      <Zap size={10} /> Review price
                    </button>
                  </div>
                </div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Inventory Health</span>
              <span className={styles.insightLead}>14 live items · 2 items low stock · 4 stagnant</span>
              <div className={styles.insightData}>
                <button className={styles.actionLink} style={{ fontSize: 13, textTransform: 'none', letterSpacing: 0 }} onClick={() => navigate('/archive?tab=stagnant')}>
                  View stagnant items <ArrowRight size={12} />
                </button>
              </div>
            </m.div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VENDOR INSIGHTS
        ═══════════════════════════════════════════════════════════════════ */}
        {st.isVendor && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Window Sell-Through</span>
              <span className={styles.insightLead}>Your last 4 windows averaged 94% sell-through.</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>3 windows in a row: Jollof Rice sold out.</div>
                <div className={styles.dataLine}>Consider increasing the cap.</div>
              </div>
              <button className={styles.actionLink} onClick={() => navigate('/archive?action=editCap&product=vendor-product-002')}>
                Update Jollof Rice cap →
              </button>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Peak Demand</span>
              <table className={styles.insightTable}>
                <tbody>
                  <tr>
                    <td className={styles.bold}>Jollof Rice</td>
                    <td>100% sold</td>
                    <td>Cap: 20</td>
                    <td>Avg: 20</td>
                  </tr>
                  <tr>
                    <td className={styles.bold}>Peppered Snail</td>
                    <td>87% sold</td>
                    <td>Cap: 15</td>
                    <td>Avg: 13</td>
                  </tr>
                  <tr>
                    <td className={styles.bold}>Small Chops</td>
                    <td>60% sold</td>
                    <td>Cap: 20</td>
                    <td>Avg: 12</td>
                  </tr>
                </tbody>
              </table>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Consistently Unsold</span>
              <div className={styles.flaggedItems}>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemRow}>
                    <span className={styles.flaggedItemName}>Rice & Stew</span>
                    <span className={styles.flaggedItemProblem}>Avg. 6/20 sold (30%)</span>
                  </div>
                  <div className={styles.flaggedActions}>
                    <button className={styles.actionLink} onClick={() => navigate('/archive?action=editCap&product=vendor-product-005')}>
                      Review cap
                    </button>
                    <button className={styles.actionLink} style={{ color: 'var(--color-fg-ghost)' }} onClick={() => navigate('/archive')}>
                      Remove from menu
                    </button>
                  </div>
                </div>
              </div>
            </m.div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            HOST INSIGHTS
        ═══════════════════════════════════════════════════════════════════ */}
        {st.isHost && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Schedule Efficiency</span>
              <span className={styles.insightLead}>This week: 7/8 available slots confirmed (88% fill rate)</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>Your 10am–12pm Tue–Thu slots fill first.</div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>No-Show Analysis</span>
              <div className={styles.allClear}>
                <CheckCircle2 size={16} /> No issues detected — 0% no-show rate this month.
              </div>
              <div className={styles.flaggedItems} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemRow}>
                    <span className={styles.flaggedItemName}>Saturday 5pm slots</span>
                    <span className={styles.flaggedItemProblem}>Potential risk: 1 cancellation</span>
                  </div>
                  <button className={styles.actionLink} onClick={() => navigate('/archive?action=editDeposit&product=svc-001')}>
                    Require full payment for this slot →
                  </button>
                </div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Revenue by Service — This Month</span>
              <table className={styles.insightTable}>
                <tbody>
                  {FIXTURE_HOST_PRODUCTS.map(p => (
                    <tr key={p.id}>
                      <td className={styles.bold}>{p.name}</td>
                      <td>{formatCurrencyFull(p.price * 5)}</td>
                      <td>5 bookings</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </m.div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            CREATOR INSIGHTS
        ═══════════════════════════════════════════════════════════════════ */}
        {st.isDigital && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Revenue Trend — Last 30 Days</span>
              <span className={styles.insightLead}>{formatCurrencyFull(stats.creatorRevenue)} total · {stats.downloadCount} downloads</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>Your Brand Starter Kit drives 68% of revenue.</div>
                <div className={styles.dataLine}>Your Lightroom Presets: 0 downloads in 14 days.</div>
              </div>
              <button className={styles.actionLink} onClick={() => navigate('/catalogue?action=checkLink&product=digital-product-002')}>
                Check Lightroom Presets →
              </button>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Delivery Health</span>
              <div className={styles.flaggedItems}>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemRow}>
                    <span className={styles.flaggedItemName}>Lightroom Preset Pack</span>
                    <span className={styles.flaggedItemProblem}>⚠ 0 downloads in 14 days</span>
                  </div>
                  <div className={styles.flaggedActions}>
                    <button className={styles.actionLink} onClick={() => navigate('/catalogue?action=checkLink&product=digital-product-002')}>
                      Check delivery link
                    </button>
                    <button className={styles.actionLink} onClick={() => navigate('/catalogue?action=feature&product=digital-product-002')}>
                      Feature this product
                    </button>
                  </div>
                </div>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemRow}>
                    <span className={styles.flaggedItemName}>Social Kit (Free)</span>
                    <span className={styles.flaggedItemProblem}>⚠ No preview asset</span>
                  </div>
                  <button className={styles.actionLink} onClick={() => navigate('/catalogue?action=addPreview&product=digital-product-005')}>
                    Add preview asset →
                  </button>
                </div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Earnings Split</span>
              <table className={styles.insightTable}>
                <tbody>
                  {FIXTURE_DIGITAL_PRODUCTS.slice(0, 4).map(p => (
                    <tr key={p.id}>
                      <td className={styles.bold}>{p.name}</td>
                      <td>{p.is_free ? 'Free' : formatCurrencyFull(p.price * 10)}</td>
                      <td>{p.is_free ? '23 claims' : '10 downloads'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </m.div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STUDIO INSIGHTS
        ═══════════════════════════════════════════════════════════════════ */}
        {st.isStudio && (
          <>
            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Pipeline Value</span>
              <span className={styles.insightLead}>{formatCurrencyFull(stats.pipelineValue)} in active projects</span>
              <div className={styles.insightData}>
                <div className={styles.dataLine}>2 projects pending deposit ({formatCurrencyFull(stats.pendingDepositValue)} outstanding)</div>
              </div>
              <button className={styles.actionLink} onClick={() => navigate('/ledger?tab=deposits')}>
                View outstanding deposits →
              </button>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Enquiry Conversion</span>
              <table className={styles.insightTable}>
                <tbody>
                  <tr>
                    <td className={styles.bold}>Brand Shoot Starter</td>
                    <td>2 enquiries → 1 confirmed</td>
                    <td>50%</td>
                  </tr>
                  <tr>
                    <td className={styles.bold}>Full Brand Identity</td>
                    <td>3 enquiries → 2 confirmed</td>
                    <td>67%</td>
                  </tr>
                  <tr>
                    <td className={styles.bold}>Custom Project</td>
                    <td>1 enquiry → 0 confirmed</td>
                    <td>0%</td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.flaggedItems} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemProblem}>Tip: Custom Project has 0 conversions. Consider adding a clearer scope description.</div>
                  <button className={styles.actionLink} onClick={() => navigate('/archive?action=editScope&product=pkg-004')}>
                    Edit Custom Project →
                  </button>
                </div>
              </div>
            </m.div>

            <m.div className={styles.insightCard} variants={cardVariants}>
              <span className={styles.insightCategory}>Response Performance</span>
              <span className={styles.insightLead}>Avg. response time: {stats.avgResponse}h this month</span>
              <div className={styles.flaggedItems}>
                <div className={styles.flaggedItem}>
                  <div className={styles.flaggedItemRow}>
                    <span className={styles.flaggedItemName}>Slowest: 26h (Tunde Ogunwale)</span>
                    <span className={styles.flaggedItemProblem}>Awaiting reply</span>
                  </div>
                  <button className={styles.actionLink} onClick={() => navigate('/bookings?enquiry=enquiry-004')}>
                    Reply to Tunde Ogunwale →
                  </button>
                </div>
              </div>
            </m.div>
          </>
        )}
      </m.div>
    </div>
  );
}
