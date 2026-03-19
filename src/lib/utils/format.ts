/**
 * Format an integer naira amount with thousand separators.
 * Returns: 12000 → "12,000"
 * All amounts stored as integers (naira, not kobo).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format with Naira symbol prefix.
 * Returns: 12000 → "₦12,000"
 */
export function formatCurrencyFull(amount: number): string {
  return `₦${formatCurrency(amount)}`;
}

/**
 * Format a date string or Date object into a human-readable format.
 */
export function formatDate(date: string | Date, style: 'short' | 'long' | 'relative' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (style === 'relative') {
    return formatRelativeDate(d);
  }

  if (style === 'long') {
    return d.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // short
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date, 'short');
}

/**
 * Format a Nigerian phone number for display.
 * +2348012345678 → 08012345678
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    return '0' + cleaned.slice(3);
  }
  return cleaned;
}

/**
 * Format a store last_active_at timestamp for the storefront trust bar.
 */
export function formatLastActive(isoString: string): string {
  const d = new Date(isoString);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Active today';
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  return '';
}

/**
 * Format a seal ID for display — uppercase and spaced.
 */
export function formatSealId(sealId: string): string {
  return sealId.toUpperCase();
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}