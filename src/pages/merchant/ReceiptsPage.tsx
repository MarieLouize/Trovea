import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from '@/lib/motion';
import { Search, Filter, Download, ExternalLink, ChevronRight, X, FileText } from 'lucide-react';
import { useLedgerStore } from '@/lib/store/ledger.store';
import { useUIStore } from '@/lib/store/ui.store';
import { formatCurrencyFull, formatDate } from '@/lib/utils/format';
import { generateCSV, downloadCSV } from '@/lib/utils/csv';
import type { PaymentStatus, ReceiptType } from '@/lib/types';
import styles from './ReceiptsPage.module.css';

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { receipts } = useLedgerStore();
  const { addToast } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReceiptType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const matchesSearch = 
        r.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.seal_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.line_items.some(li => li.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || r.payment_status === statusFilter;
      const matchesType = typeFilter === 'all' || r.receipt_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [receipts, searchTerm, statusFilter, typeFilter]);

  const handleExport = () => {
    const csv = generateCSV(filteredReceipts);
    downloadCSV(csv, `receipts-${new Date().toISOString().split('T')[0]}.csv`);
    addToast('Receipts exported to CSV', 'success');
  };

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Receipts</h1>
          <p className={styles.pageSubtitle}>{filteredReceipts.length} transactions found</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerBtn} onClick={handleExport}>
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by buyer, ID, or item..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearSearch} onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          className={`${styles.filterToggle} ${showFilters ? styles.filterActive : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          <span>Filters</span>
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <m.div 
            className={styles.filtersPanel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className={styles.filtersInner}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Payment Status</label>
                <div className={styles.filterOptions}>
                  {['all', 'paid', 'pending_payment', 'cancelled'].map(s => (
                    <button 
                      key={s}
                      className={`${styles.filterOpt} ${statusFilter === s ? styles.optActive : ''}`}
                      onClick={() => setStatusFilter(s as PaymentStatus | 'all')}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Transaction Type</label>
                <div className={styles.filterOptions}>
                  {['all', 'sale', 'order', 'booking', 'download', 'project'].map(t => (
                    <button 
                      key={t}
                      className={`${styles.filterOpt} ${typeFilter === t ? styles.optActive : ''}`}
                      onClick={() => setTypeFilter(t as ReceiptType | 'all')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <div className={styles.receiptList}>
        {filteredReceipts.length === 0 ? (
          <div className={styles.emptyState}>
            <FileText size={40} className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>No receipts found</h2>
            <p className={styles.emptyText}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Seal ID</th>
                  <th>Date</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/receipt/${r.id}`)} className={styles.row}>
                    <td>
                      <span className={styles.sealId}>{r.seal_id}</span>
                      <span className={styles.typeTag}>{r.receipt_type}</span>
                    </td>
                    <td>
                      <span className={styles.date}>{formatDate(r.created_at, 'short')}</span>
                    </td>
                    <td>
                      <span className={styles.buyerName}>{r.buyer_name}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[r.payment_status]}`}>
                        <div className={styles.statusDot} />
                        {r.payment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={styles.amount}>{formatCurrencyFull(r.total)}</span>
                    </td>
                    <td>
                      <ChevronRight size={16} className={styles.chevron} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile View Cards */}
            <div className={styles.mobileCards}>
              {filteredReceipts.map((r) => (
                <div key={r.id} className={styles.card} onClick={() => navigate(`/receipt/${r.id}`)}>
                  <div className={styles.cardHeader}>
                    <span className={styles.sealId}>{r.seal_id}</span>
                    <span className={`${styles.statusBadge} ${styles[r.payment_status]}`}>
                      {r.payment_status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.cardBuyer}>{r.buyer_name}</p>
                    <p className={styles.cardMeta}>{r.receipt_type} · {formatDate(r.created_at, 'relative')}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardAmount}>{formatCurrencyFull(r.total)}</span>
                    <ExternalLink size={14} className={styles.cardLink} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
