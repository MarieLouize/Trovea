/**
 * Trove'a — WhatsApp Link Utilities
 * All builders encode a pre-filled message for a specific context.
 * Phone numbers must be in international format without '+' or spaces.
 */

function encodeWA(phone: string, message: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

// ─── Chat to Buy ───────────────────────────────────────────────────────────

interface ChatToBuyParams {
  phone: string;
  itemName: string;
  price: number;
  variantLabel?: string;
  storeName: string;
}

export function buildChatToBuyLink(params: ChatToBuyParams): string {
  const { phone, itemName, price, variantLabel, storeName } = params;
  const priceStr = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);

  const variantPart = variantLabel ? `\nVariant: ${variantLabel}` : '';
  const message = `Hi ${storeName}! I'd like to buy:\n\n${itemName}${variantPart}\nPrice: ${priceStr}\n\nIs this still available?`;
  return encodeWA(phone, message);
}

// ─── Claim Confirm ────────────────────────────────────────────────────────

interface ClaimConfirmParams {
  phone: string;
  itemName: string;
  price: number;
  storeName: string;
}

export function buildClaimConfirmLink(params: ClaimConfirmParams): string {
  const { phone, itemName, price, storeName } = params;
  const priceStr = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);

  const message = `Hi ${storeName}! I just submitted a claim for:\n\n${itemName} — ${priceStr}\n\nPlease confirm my order. Thank you!`;
  return encodeWA(phone, message);
}

// ─── Store Contact ────────────────────────────────────────────────────────

export function buildStoreContactLink(phone: string, storeName: string): string {
  const message = `Hi ${storeName}! I have a question about your store.`;
  return encodeWA(phone, message);
}

// ─── Receipt Follow-Up ────────────────────────────────────────────────────

export function buildReceiptFollowUpLink(
  phone: string,
  sealId: string,
  storeName: string
): string {
  const message = `Hi ${storeName}! I'm following up on my order — Seal ID: ${sealId}`;
  return encodeWA(phone, message);
}