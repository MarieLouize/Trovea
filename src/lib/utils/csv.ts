import type { Receipt } from '@/lib/types';

export const generateCSV = (receipts: Receipt[]): string => {
  const headers = [
    'Seal ID', 'Type', 'Buyer', 'Date', 'Status',
    'Payment Method', 'Subtotal (₦)', 'Discount (₦)', 'Total (₦)',
    'Shipment Status', 'Notes', 'Sale Note'
  ];
  
  const escape = (v: string | number | null | undefined) => {
    const str = v === null || v === undefined ? '' : String(v);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = receipts.map(r => [
    r.seal_id,
    r.receipt_type ?? 'sale',
    r.buyer_name,
    new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
    r.payment_status,
    r.payment_method ?? '',
    r.subtotal.toString(),
    r.discount_amount.toString(),
    r.total.toString(),
    r.shipment_status,
    r.notes ?? '',
    r.sale_note ?? ''
  ].map(escape).join(','));

  return [headers.map(escape).join(','), ...rows].join('\n');
};

export const downloadCSV = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
