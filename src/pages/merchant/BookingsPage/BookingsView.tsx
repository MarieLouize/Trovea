import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, MessageCircle, Package, Clock, XCircle, 
  ArrowRight, UserCheck, UserMinus, ExternalLink 
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { Booking, Enquiry } from '@/lib/types';
import { FIXTURE_BOOKINGS, FIXTURE_ENQUIRIES, FIXTURE_STUDIO_PRODUCTS } from '@/lib/fixtures';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull, formatPhone } from '@/lib/utils/format';
import { buildStoreContactLink } from '@/lib/utils/whatsapp';
import styles from './BookingsPage.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const HOST_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const STUDIO_TABS = [
  { value: 'new', label: 'New Enquiries' },
  { value: 'in_discussion', label: 'In Discussion' },
  { value: 'active_project', label: 'Active Projects' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

const getWaitingTime = (createdAt: string): string => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
};

const getTimeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

function formatScheduledAt(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const navigate = useNavigate();
  const st = useStoreType();
  const merchant = useMerchantStore((s) => s.merchant);
  const { addToast } = useUIStore();

  const [searchParams] = useSearchParams();

  // ── State ──
  const [bookings, setBookings] = useState<Booking[]>(FIXTURE_BOOKINGS);
  const [enquiries, setEnquiries] = useState<Enquiry[]>(
    FIXTURE_ENQUIRIES.filter(e => e.merchant_id === merchant.id)
  );
  const [hostTab, setHostTab] = useState<string>('pending');
  const [studioTab, setStudioTab] = useState<string>('new');
  const [expandedEnquiries, setExpandedEnquiries] = useState<Record<string, boolean>>({});
  const [noShows, setNoShows] = useState<Record<string, boolean>>({});

  // ── Param Handling ──
  useEffect(() => {
    const enqId = searchParams.get('enquiry');
    if (enqId && st.isStudio) {
      const enq = enquiries.find(e => e.id === enqId);
      if (enq) {
        setStudioTab(enq.status);
        setExpandedEnquiries(prev => ({ ...prev, [enqId]: true }));
      }
    }
  }, [searchParams, enquiries, st.isStudio]);

  // ── Computed ──
  const avgResponseHours = useMemo(() => {
    const withResponse = FIXTURE_ENQUIRIES.filter(
      e => e.merchant_id === merchant.id && e.response_time_hours !== null
    );
    if (!withResponse.length) return null;
    return Math.round(
      withResponse.reduce((sum, e) => sum + (e.response_time_hours ?? 0), 0) / withResponse.length
    );
  }, [merchant.id]);

  // ── Handlers ──
  const updateBookingStatus = (id: string, status: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const updateEnquiryStatus = (id: string, status: Enquiry['status']) => {
    setEnquiries(prev => prev.map(e => 
      e.id === id ? { ...e, status, updated_at: new Date().toISOString() } : e
    ));
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return;
    const link = buildStoreContactLink(phone, merchant.store_name);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const toggleEnquiryExpand = (id: string) => {
    setExpandedEnquiries(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNoShow = (id: string, isNoShow: boolean) => {
    setNoShows(prev => ({ ...prev, [id]: isNoShow }));
    if (isNoShow) addToast('No-show recorded', 'info');
  };

  const handleRebook = (booking: Booking) => {
    const params = new URLSearchParams({
      service: booking.service_id,
      client: booking.buyer_name,
      phone: booking.buyer_phone ?? '',
    });
    navigate(`/terminal?${params.toString()}`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: STUDIO (Enquiry CRM)
  // ═══════════════════════════════════════════════════════════════════════════
  if (st.isStudio) {
    const filteredEnquiries = enquiries.filter(e => e.status === studioTab);

    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Enquiries & Projects</h1>
            {avgResponseHours !== null && (
              <p className={styles.avgResponse}>Avg response: {avgResponseHours}h this month</p>
            )}
          </div>
        </div>

        <div className={styles.tabs}>
          {STUDIO_TABS.map(tab => (
            <button
              key={tab.value}
              className={`${styles.tab} ${studioTab === tab.value ? styles.tabActive : ''}`}
              onClick={() => setStudioTab(tab.value)}
            >
              {tab.label}
              {tab.value === 'new' && enquiries.filter(e => e.status === 'new').length > 0 && (
                <span className={styles.tabBadge}>{enquiries.filter(e => e.status === 'new').length}</span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.bookingList}>
          <AnimatePresence mode="popLayout">
            {filteredEnquiries.length === 0 ? (
              <m.div key="empty" className={styles.emptyState}>No enquiries in this stage.</m.div>
            ) : (
              filteredEnquiries.map(enquiry => (
                <m.div
                  key={enquiry.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={styles.enquiryCard}
                >
                  <div className={styles.enquiryHeader}>
                    <div className={styles.clientInfo}>
                      <span className={styles.clientName}>{enquiry.client_name}</span>
                      {enquiry.company && <span className={styles.companyName}>{enquiry.company}</span>}
                    </div>
                    <span className={styles.timeAgo}>{getTimeAgo(enquiry.created_at)}</span>
                  </div>

                  <div className={styles.enquiryMeta}>
                    <span>{enquiry.project_type}</span>
                    <span>•</span>
                    <span>{enquiry.budget_range}</span>
                  </div>

                  <div className={styles.enquiryMessage}>
                    {expandedEnquiries[enquiry.id] 
                      ? enquiry.message 
                      : `${enquiry.message.slice(0, 100)}${enquiry.message.length > 100 ? '...' : ''}`}
                    {enquiry.message.length > 100 && (
                      <button className={styles.readMoreBtn} onClick={() => toggleEnquiryExpand(enquiry.id)}>
                        {expandedEnquiries[enquiry.id] ? 'read less' : 'read more'}
                      </button>
                    )}
                  </div>

                  {enquiry.package_id && (
                    <div className={styles.packageLink}>
                      <Package size={12} />
                      Enquired about: {FIXTURE_STUDIO_PRODUCTS.find(p => p.id === enquiry.package_id)?.name}
                    </div>
                  )}

                  {enquiry.status === 'active_project' && enquiry.package_value && (
                    <div className={styles.packageValue}>
                      {formatCurrencyFull(enquiry.package_value)}
                      {enquiry.deposit_paid && (
                        <div className={styles.depositStatus}>
                          <span className={styles.depositPaid}>✓ {formatCurrencyFull(enquiry.deposit_paid)} received</span>
                          <span> · Balance: {formatCurrencyFull(enquiry.package_value - enquiry.deposit_paid)} pending</span>
                        </div>
                      )}
                    </div>
                  )}

                  {enquiry.status === 'completed' && enquiry.package_value && (
                    <div className={styles.packageValue}>
                      Project Value: {formatCurrencyFull(enquiry.package_value)}
                    </div>
                  )}

                  <div className={styles.enquiryActions}>
                    {enquiry.status === 'new' && (
                      <>
                        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => updateEnquiryStatus(enquiry.id, 'in_discussion')}>
                          Move to Discussion
                        </button>
                        <button className={styles.actionBtn} onClick={() => updateEnquiryStatus(enquiry.id, 'declined')}>
                          Decline
                        </button>
                      </>
                    )}
                    {enquiry.status === 'in_discussion' && (
                      <>
                        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => updateEnquiryStatus(enquiry.id, 'active_project')}>
                          Start Project
                        </button>
                        <button className={styles.actionBtn} onClick={() => updateEnquiryStatus(enquiry.id, 'declined')}>
                          Decline
                        </button>
                      </>
                    )}
                    {enquiry.status === 'active_project' && (
                      <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => updateEnquiryStatus(enquiry.id, 'completed')}>
                        Mark Completed
                      </button>
                    )}
                    {enquiry.status === 'declined' && (
                      <button className={styles.actionBtn} onClick={() => updateEnquiryStatus(enquiry.id, 'new')}>
                        Reopen
                      </button>
                    )}
                    <button className={`${styles.actionBtn} ${styles.actionBtnWhatsApp}`} onClick={() => handleWhatsApp('+2348012345678')}>
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </div>
                </m.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: HOST (Appointment Manager)
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredBookings = bookings.filter(b => b.status === hostTab);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Appointments</h1>
      </div>

      <div className={styles.tabs}>
        {HOST_TABS.map(tab => (
          <button
            key={tab.value}
            className={`${styles.tab} ${hostTab === tab.value ? styles.tabActive : ''}`}
            onClick={() => setHostTab(tab.value)}
          >
            {tab.label}
            {tab.value === 'pending' && bookings.filter(b => b.status === 'pending').length > 0 && (
              <span className={styles.tabBadge}>{bookings.filter(b => b.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.bookingList}>
        <AnimatePresence mode="popLayout">
          {filteredBookings.length === 0 ? (
            <m.div key="empty" className={styles.emptyState}>No {hostTab} appointments.</m.div>
          ) : (
            filteredBookings.map(booking => {
              const isWaitingLong = hostTab === 'pending' && (Date.now() - new Date(booking.created_at).getTime()) > 86400000;
              
              return (
                <m.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`${styles.bookingCard} ${isWaitingLong ? styles.waitingTimeLong : ''}`}
                >
                  <div className={styles.cardTopRow}>
                    <span className={styles.cardService}>{booking.service_name}</span>
                    <span className={styles.bookingAmount}>{formatCurrencyFull(booking.total_amount)}</span>
                  </div>

                  <div className={styles.bookingMeta}>
                    <span className={styles.buyerName}>{booking.buyer_name}</span>
                    <span className={styles.bookingTime}>{formatScheduledAt(booking.scheduled_at)}</span>
                  </div>

                  {hostTab === 'pending' && (
                    <div className={styles.waitingTime}>
                      <Clock size={10} /> Waiting {getWaitingTime(booking.created_at)}
                      {booking.deposit_paid > 0 && <span>• {formatCurrencyFull(booking.deposit_paid)} deposit req.</span>}
                    </div>
                  )}

                  {hostTab === 'confirmed' && (
                    <div className={styles.depositStatus}>
                      <span className={styles.depositPaid}>✓ Paid {formatCurrencyFull(booking.deposit_paid)}</span>
                      <span> · Balance: {formatCurrencyFull(booking.total_amount - booking.deposit_paid)} due at appointment</span>
                    </div>
                  )}

                  {hostTab === 'completed' && (
                    <>
                      {noShows[booking.id] === undefined ? (
                        <div className={styles.noShowPrompt}>
                          <span className={styles.noShowLabel}>Did the client show up?</span>
                          <div className={styles.noShowActions}>
                            <button className={styles.noShowBtn} onClick={() => handleNoShow(booking.id, false)}>Yes</button>
                            <button className={styles.noShowBtn} onClick={() => handleNoShow(booking.id, true)}>No — No-show</button>
                          </div>
                        </div>
                      ) : noShows[booking.id] ? (
                        <div className={styles.noShowRecorded}>
                          <UserMinus size={12} /> No-show recorded
                        </div>
                      ) : (
                        <div className={styles.noShowRecorded} style={{ color: 'var(--color-success)' }}>
                          <UserCheck size={12} /> Client showed up
                        </div>
                      )}
                      <button className={styles.rebookBtn} onClick={() => handleRebook(booking)}>
                        Rebook — same service
                      </button>
                    </>
                  )}

                  <div className={styles.enquiryActions}>
                    {hostTab === 'pending' && (
                      <>
                        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => updateBookingStatus(booking.id, 'confirmed')}>
                          Confirm
                        </button>
                        <button className={styles.actionBtn} onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                          Decline
                        </button>
                      </>
                    )}
                    {hostTab === 'confirmed' && (
                      <>
                        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => updateBookingStatus(booking.id, 'completed')}>
                          Mark Completed
                        </button>
                        <button className={styles.actionBtn} onClick={() => updateBookingStatus(booking.id, 'cancelled')}>
                          Cancel
                        </button>
                      </>
                    )}
                    <button className={`${styles.actionBtn} ${styles.actionBtnWhatsApp}`} onClick={() => handleWhatsApp(booking.buyer_phone)}>
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </div>
                </m.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
