import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageCircle, Package, Clock,
  UserCheck, UserMinus, ChevronDown, StickyNote, X, Users, Star
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/motion';
import type { Booking, Enquiry, Product } from '@/lib/types';
import { getBookingsByMerchant, updateBooking as apiUpdateBooking } from '@/lib/api/bookings.api';
import { getProductsByMerchant } from '@/lib/api/products.api';
import { useStoreType } from '@/lib/hooks/use-store-type';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import {
  buildStoreContactLink,
  buildAppointmentReminderLink,
  buildBalanceDueLink
} from '@/lib/utils/whatsapp';
import styles from './BookingsPage.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const HOST_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const STUDIO_TABS = [
  { value: 'new', label: 'New' },
  { value: 'in_discussion', label: 'Discussing' },
  { value: 'active_project', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'clients', label: 'Clients' },
] as const;

const STATUS_LABELS: Record<Enquiry['status'], string> = {
  new: 'New',
  in_discussion: 'In Discussion',
  active_project: 'Active Project',
  completed: 'Completed',
  declined: 'Declined',
};

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [hostTab, setHostTab] = useState<string>('pending');
  const [studioTab, setStudioTab] = useState<string>('new');
  const [expandedEnquiries, setExpandedEnquiries] = useState<Record<string, boolean>>({});
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [noShows, setNoShows] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const declineInputRef = useRef<HTMLInputElement>(null);

  // Phase 3E: Initial data load
  useEffect(() => {
    const loadData = async () => {
      const hasApi = !!import.meta.env.VITE_API_URL;
      if (!hasApi) {
        const { FIXTURE_BOOKINGS, FIXTURE_ENQUIRIES, FIXTURE_STUDIO_PRODUCTS } = await import('@/lib/fixtures');
        const merchantBookings = FIXTURE_BOOKINGS.filter(b => b.merchant_id === merchant.id);
        setBookings(merchantBookings);
        // Seed no-show map from fixture data
        const seedNoShows: Record<string, boolean> = {};
        merchantBookings.forEach(b => { if (b.no_show) seedNoShows[b.id] = true; });
        setNoShows(seedNoShows);
        setEnquiries(FIXTURE_ENQUIRIES.filter(e => e.merchant_id === merchant.id));
        setProducts(FIXTURE_STUDIO_PRODUCTS);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [b, p] = await Promise.all([
          getBookingsByMerchant(),
          getProductsByMerchant(merchant.id)
        ]);
        setBookings(b);
        const seedNoShows: Record<string, boolean> = {};
        b.forEach((bk: Booking) => { if (bk.no_show) seedNoShows[bk.id] = true; });
        setNoShows(seedNoShows);
        setProducts(p);
        const { FIXTURE_ENQUIRIES } = await import('@/lib/fixtures');
        setEnquiries(FIXTURE_ENQUIRIES.filter(e => e.merchant_id === merchant.id));
      } catch (err) {
        console.error('Failed to load bookings data:', err);
        addToast('Failed to load data', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [merchant.id, addToast]);

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

  // Seed note drafts from fixture notes when enquiries load
  useEffect(() => {
    if (enquiries.length > 0) {
      const initial: Record<string, string> = {};
      enquiries.forEach(e => { if (e.notes) initial[e.id] = e.notes; });
      setNoteDrafts(prev => ({ ...initial, ...prev }));
    }
  }, [enquiries]);

  // Focus decline input when it opens
  useEffect(() => {
    if (decliningId) {
      setTimeout(() => declineInputRef.current?.focus(), 50);
    }
  }, [decliningId]);

  // ── Computed ──
  const avgResponseHours = useMemo(() => {
    const withResponse = enquiries.filter(e => e.response_time_hours !== null);
    if (!withResponse.length) return null;
    return Math.round(
      withResponse.reduce((sum, e) => sum + (e.response_time_hours ?? 0), 0) / withResponse.length
    );
  }, [enquiries]);

  const clientList = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string | null;
      company: string | null;
      enquiryCount: number;
      totalValue: number;
      lastActive: string;
      statuses: Enquiry['status'][];
    }>();

    for (const e of enquiries) {
      const key = e.client_name.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.enquiryCount++;
        existing.totalValue += e.package_value ?? 0;
        if (e.updated_at > existing.lastActive) existing.lastActive = e.updated_at;
        existing.statuses.push(e.status);
      } else {
        map.set(key, {
          name: e.client_name,
          phone: e.client_phone ?? null,
          company: e.company,
          enquiryCount: 1,
          totalValue: e.package_value ?? 0,
          lastActive: e.updated_at,
          statuses: [e.status],
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    );
  }, [enquiries]);

  // ── Enquiry Handlers ──
  const updateEnquiryStatus = (id: string, status: Enquiry['status'], opts?: { reason?: string }) => {
    setEnquiries(prev => prev.map(e =>
      e.id === id
        ? { ...e, status, updated_at: new Date().toISOString(), decline_reason: opts?.reason ?? e.decline_reason }
        : e
    ));
    addToast(`Moved to ${STATUS_LABELS[status]}`, 'success');
  };

  const saveNote = (id: string) => {
    const note = noteDrafts[id] ?? '';
    setEnquiries(prev => prev.map(e =>
      e.id === id ? { ...e, notes: note || null, updated_at: new Date().toISOString() } : e
    ));
    addToast('Note saved', 'success');
    setNotesOpen(prev => ({ ...prev, [id]: false }));
  };

  const handleDecline = (id: string) => {
    updateEnquiryStatus(id, 'declined', { reason: declineReason.trim() || undefined });
    setDecliningId(null);
    setDeclineReason('');
  };

  // ── Booking Handlers ──
  const updateBookingStatus = async (id: string, status: Booking['status']) => {
    const hasApi = !!import.meta.env.VITE_API_URL;
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    if (hasApi) {
      try {
        await apiUpdateBooking(id, { status });
        addToast(`Booking ${status}`, 'success');
      } catch {
        addToast('Failed to update booking', 'error');
      }
    } else {
      addToast(`Booking ${status}`, 'info');
    }
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
    // Persist into bookings state so the record survives tab switches
    setBookings(prev =>
      prev.map(b => b.id === id ? { ...b, no_show: isNoShow } : b)
    );
    if (isNoShow) addToast('No-show recorded', 'info');
    else addToast('Attendance confirmed', 'success');
  };

  const handleRebook = (booking: Booking) => {
    const params = new URLSearchParams({
      service: booking.service_id,
      client: booking.buyer_name,
      phone: booking.buyer_phone ?? '',
    });
    navigate(`/terminal?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className="skeleton-text" style={{ width: '180px', height: '28px' }} />
        </div>
        <div className={styles.tabs}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ width: '80px', height: '32px', borderRadius: 'var(--r-pill)' }} />
          ))}
        </div>
        <div className={styles.bookingList}>
          {[1,2,3].map(i => (
            <div key={i} className={styles.bookingCard} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div className="skeleton-text" style={{ width: '40%', height: '18px' }} />
                <div className="skeleton-text" style={{ width: '20%', height: '18px' }} />
              </div>
              <div className="skeleton-text" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
              <div className="skeleton-text" style={{ width: '30%', height: '12px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          {STUDIO_TABS.map(tab => {
            const count = enquiries.filter(e => e.status === tab.value).length;
            return (
              <button
                key={tab.value}
                className={`${styles.tab} ${studioTab === tab.value ? styles.tabActive : ''}`}
                onClick={() => setStudioTab(tab.value)}
              >
                {tab.label}
                {count > 0 && (
                  <span className={styles.tabBadge}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── CLIENTS TAB ── */}
        {studioTab === 'clients' && (
          <div className={styles.bookingList}>
            {clientList.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">—</span>
                <h2 className="empty-state__title">No clients yet.</h2>
                <p className="empty-state__text">Clients from enquiries will appear here.</p>
              </div>
            ) : clientList.map(client => {
              const isRepeat = client.enquiryCount >= 2;
              const hasActive = client.statuses.some(s => s === 'active_project');
              return (
                <m.div
                  key={client.name}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.clientCard}
                >
                  <div className={styles.clientCardHeader}>
                    <div className={styles.clientCardAvatar}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.clientCardInfo}>
                      <div className={styles.clientCardNameRow}>
                        <span className={styles.clientCardName}>{client.name}</span>
                        {isRepeat && (
                          <span className={styles.repeatBadge}>
                            <Star size={9} /> Repeat
                          </span>
                        )}
                        {hasActive && (
                          <span className={styles.activeBadge}>Active</span>
                        )}
                      </div>
                      {client.company && (
                        <span className={styles.clientCardCompany}>{client.company}</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.clientCardStats}>
                    <div className={styles.clientStat}>
                      <span className={styles.clientStatValue}>{client.enquiryCount}</span>
                      <span className={styles.clientStatLabel}>{client.enquiryCount === 1 ? 'Enquiry' : 'Enquiries'}</span>
                    </div>
                    {client.totalValue > 0 && (
                      <div className={styles.clientStat}>
                        <span className={styles.clientStatValue}>{formatCurrencyFull(client.totalValue)}</span>
                        <span className={styles.clientStatLabel}>Total value</span>
                      </div>
                    )}
                    <div className={styles.clientStat}>
                      <span className={styles.clientStatValue}>{getTimeAgo(client.lastActive)}</span>
                      <span className={styles.clientStatLabel}>Last active</span>
                    </div>
                  </div>

                  <div className={styles.clientCardActions}>
                    <button
                      className={styles.clientViewBtn}
                      onClick={() => {
                        setStudioTab('new');
                        // Jump to first enquiry from this client
                        const enq = enquiries.find(e => e.client_name.toLowerCase() === client.name.toLowerCase());
                        if (enq) {
                          setStudioTab(enq.status);
                          setExpandedEnquiries(prev => ({ ...prev, [enq.id]: true }));
                        }
                      }}
                    >
                      View Enquiries
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnWhatsApp}`}
                      style={{ flex: 'none', padding: 'var(--space-2) var(--space-4)' }}
                      onClick={() => handleWhatsApp(client.phone)}
                    >
                      <MessageCircle size={13} />
                    </button>
                  </div>
                </m.div>
              );
            })}
          </div>
        )}

        {/* ── ENQUIRIES LIST ── */}
        {studioTab !== 'clients' && (
        <div className={styles.bookingList}>
          <AnimatePresence mode="popLayout">
            {filteredEnquiries.length === 0 ? (
              <m.div key="empty" className="empty-state">
                <span className="empty-state__icon">—</span>
                <h2 className="empty-state__title">No enquiries here.</h2>
                <p className="empty-state__text">New project requests will appear here.</p>
              </m.div>
            ) : (
              filteredEnquiries.map(enquiry => {
                const isOverdue = enquiry.status === 'new' &&
                  (Date.now() - new Date(enquiry.created_at).getTime()) > 24 * 3600000;
                const isNoteOpen = notesOpen[enquiry.id] ?? false;
                const isDeclining = decliningId === enquiry.id;

                return (
                  <m.div
                    key={enquiry.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`${styles.enquiryCard} ${isOverdue ? styles.enquiryCardOverdue : ''}`}
                  >
                    {/* Header */}
                    <div className={styles.enquiryHeader}>
                      <div className={styles.clientInfo}>
                        <span className={styles.clientName}>{enquiry.client_name}</span>
                        {enquiry.company && <span className={styles.companyName}>{enquiry.company}</span>}
                      </div>
                      <div className={styles.enquiryHeaderRight}>
                        {isOverdue && (
                          <span className={styles.overdueChip}>
                            <Clock size={10} /> {getWaitingTime(enquiry.created_at)} waiting
                          </span>
                        )}
                        <span className={styles.timeAgo}>{getTimeAgo(enquiry.created_at)}</span>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className={styles.enquiryMeta}>
                      <span>{enquiry.project_type}</span>
                      <span>•</span>
                      <span>{enquiry.budget_range}</span>
                      <span>•</span>
                      <span>{enquiry.timeline}</span>
                    </div>

                    {/* Message */}
                    <div className={styles.enquiryMessage}>
                      {expandedEnquiries[enquiry.id]
                        ? enquiry.message
                        : `${enquiry.message.slice(0, 120)}${enquiry.message.length > 120 ? '…' : ''}`}
                      {enquiry.message.length > 120 && (
                        <button className={styles.readMoreBtn} onClick={() => toggleEnquiryExpand(enquiry.id)}>
                          {expandedEnquiries[enquiry.id] ? 'less' : 'more'}
                        </button>
                      )}
                    </div>

                    {/* Package link */}
                    {enquiry.package_id && (
                      <div className={styles.packageLink}>
                        <Package size={12} />
                        {products.find(p => p.id === enquiry.package_id)?.name ?? 'Package enquiry'}
                      </div>
                    )}

                    {/* Financials */}
                    {enquiry.status === 'active_project' && enquiry.package_value && (
                      <div className={styles.financialRow}>
                        <span className={styles.packageValue}>{formatCurrencyFull(enquiry.package_value)}</span>
                        {enquiry.deposit_paid !== null && (
                          <div className={styles.depositStatus}>
                            <span className={styles.depositPaid}>✓ {formatCurrencyFull(enquiry.deposit_paid)} deposit</span>
                            <span> · Balance: {formatCurrencyFull(enquiry.package_value - enquiry.deposit_paid)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {enquiry.status === 'completed' && enquiry.package_value && (
                      <div className={styles.financialRow}>
                        <span className={styles.packageValue}>{formatCurrencyFull(enquiry.package_value)}</span>
                        <span className={styles.depositPaid}>✓ Paid in full</span>
                      </div>
                    )}

                    {/* Decline reason (when declined) */}
                    {enquiry.status === 'declined' && enquiry.decline_reason && (
                      <div className={styles.declineReasonDisplay}>
                        Reason: {enquiry.decline_reason}
                      </div>
                    )}

                    {/* Notes section */}
                    <div className={styles.notesSection}>
                      <button
                        className={styles.notesToggle}
                        onClick={() => setNotesOpen(prev => ({ ...prev, [enquiry.id]: !prev[enquiry.id] }))}
                      >
                        <StickyNote size={12} />
                        {enquiry.notes || noteDrafts[enquiry.id]
                          ? 'View note'
                          : 'Add note'}
                        <ChevronDown size={11} className={isNoteOpen ? styles.chevronOpen : undefined} />
                      </button>

                      <AnimatePresence>
                        {isNoteOpen && (
                          <m.div
                            key="note"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className={styles.notesBody}>
                              <textarea
                                className={styles.notesTextarea}
                                placeholder="Add private notes — visible only to you…"
                                value={noteDrafts[enquiry.id] ?? ''}
                                onChange={e => setNoteDrafts(prev => ({ ...prev, [enquiry.id]: e.target.value }))}
                                rows={3}
                              />
                              <div className={styles.notesActions}>
                                <button
                                  className={styles.notesSaveBtn}
                                  onClick={() => saveNote(enquiry.id)}
                                >
                                  Save note
                                </button>
                                <button
                                  className={styles.notesCancelBtn}
                                  onClick={() => setNotesOpen(prev => ({ ...prev, [enquiry.id]: false }))}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Decline-with-reason inline */}
                    <AnimatePresence>
                      {isDeclining && (
                        <m.div
                          key="decline"
                          className={styles.declinePanel}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className={styles.declinePanelInner}>
                            <input
                              ref={declineInputRef}
                              className={styles.declineInput}
                              placeholder="Optional: reason for declining…"
                              value={declineReason}
                              onChange={e => setDeclineReason(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleDecline(enquiry.id);
                                if (e.key === 'Escape') { setDecliningId(null); setDeclineReason(''); }
                              }}
                            />
                            <div className={styles.declinePanelActions}>
                              <button className={styles.declineConfirmBtn} onClick={() => handleDecline(enquiry.id)}>
                                Decline
                              </button>
                              <button className={styles.declineCancelBtn} onClick={() => { setDecliningId(null); setDeclineReason(''); }}>
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>

                    {/* Actions */}
                    {!isDeclining && (
                      <div className={styles.enquiryActions}>
                        {enquiry.status === 'new' && (
                          <>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                              onClick={() => updateEnquiryStatus(enquiry.id, 'in_discussion')}
                            >
                              Start Discussion
                            </button>
                            <button
                              className={styles.actionBtn}
                              onClick={() => { setDecliningId(enquiry.id); setDeclineReason(''); }}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {enquiry.status === 'in_discussion' && (
                          <>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                              onClick={() => updateEnquiryStatus(enquiry.id, 'active_project')}
                            >
                              Start Project
                            </button>
                            <button
                              className={styles.actionBtn}
                              onClick={() => { setDecliningId(enquiry.id); setDeclineReason(''); }}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {enquiry.status === 'active_project' && (
                          <>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                              onClick={() => updateEnquiryStatus(enquiry.id, 'completed')}
                            >
                              Mark Complete
                            </button>
                            {enquiry.package_value !== null && enquiry.deposit_paid !== null &&
                              enquiry.deposit_paid < enquiry.package_value && (
                              <button
                                className={styles.actionBtn}
                                onClick={() => {
                                  const url = buildBalanceDueLink({
                                    phone: enquiry.client_phone ?? '',
                                    buyerName: enquiry.client_name,
                                    projectName: enquiry.project_type,
                                    balanceAmount: (enquiry.package_value ?? 0) - (enquiry.deposit_paid ?? 0),
                                    storeName: merchant.store_name,
                                  });
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                Request Balance ↗
                              </button>
                            )}
                          </>
                        )}
                        {enquiry.status === 'declined' && (
                          <button
                            className={styles.actionBtn}
                            onClick={() => updateEnquiryStatus(enquiry.id, 'new')}
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnWhatsApp}`}
                          onClick={() => handleWhatsApp(enquiry.client_phone)}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                      </div>
                    )}
                  </m.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
        )}
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
            <m.div key="empty" className="empty-state">
              <span className="empty-state__icon">—</span>
              <h2 className="empty-state__title">No appointments here.</h2>
              <p className="empty-state__text">Scheduled slots will appear here.</p>
            </m.div>
          ) : (
            filteredBookings.map(booking => {
              const isWaitingLong = hostTab === 'pending' && (Date.now() - new Date(booking.created_at).getTime()) > 8 * 3600000;
              const isPassed = hostTab === 'confirmed' && new Date(booking.scheduled_at).getTime() < Date.now();

              return (
                <m.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`${styles.bookingCard} ${isWaitingLong ? styles.waitingTimeLong : ''} ${isPassed ? 'surface-amber' : ''}`}
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

                  {isPassed && (
                    <div className={styles.noShowPrompt}>
                      <span className={styles.noShowLabel}>Appointment has started. Did they show up?</span>
                      <div className={styles.noShowActions}>
                        <button className={styles.noShowBtn} onClick={() => updateBookingStatus(booking.id, 'completed')}>
                          Yes, they're here
                        </button>
                        <button className={styles.noShowBtn} style={{ color: 'var(--color-error)' }} onClick={() => handleNoShow(booking.id, true)}>
                          No, no-show
                        </button>
                      </div>
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
                        <div className={styles.noShowRecorded} style={{ color: 'var(--color-success-text)' }}>
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
                        <button
                          className={styles.actionBtn}
                          onClick={() => {
                            const url = buildAppointmentReminderLink({
                              phone: booking.buyer_phone ?? '',
                              buyerName: booking.buyer_name,
                              serviceName: booking.service_name,
                              appointmentTime: formatDate(booking.scheduled_at, 'long'),
                              storeName: merchant.store_name,
                              arrivalNote: merchant.arrival_notes,
                            });
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          Send Reminder ↗
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
