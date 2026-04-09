/**
 * Trove'a — WhatsApp Link Utilities
 * All builders encode a pre-filled message for a specific context.
 * Phone numbers must be in international format without '+' or spaces.
 */

function encodeWA(phone: string | null | undefined, message: string): string {
  if (!phone) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  const clean = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(val);

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
  const priceStr = formatCurrency(price);

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
  buyerName?: string;
}

export function buildClaimConfirmLink(params: ClaimConfirmParams): string {
  const { phone, itemName, price, storeName, buyerName } = params;
  const priceStr = formatCurrency(price);
  const namePart = buyerName ? ` My name is ${buyerName}.` : '';

  const message = `Hi ${storeName}! I'm claiming ${itemName} (${priceStr}).${namePart}\n\nPlease confirm my order and send payment details.`;
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

// ─── Phase 2.6-C Templates ────────────────────────────────────────────────

// All types — Order/booking confirmed
export function buildOrderConfirmedLink(params: {
  phone: string;
  buyerName: string;
  sealId: string;
  storeName: string;
  total: number;
}): string {
  const { phone, buyerName, sealId, storeName, total } = params;
  const message = `Hi ${buyerName}! ✓ Your order with ${storeName} is confirmed.\n\nOrder ref: ${sealId}\nTotal: ${formatCurrency(total)}\n\nWe'll be in touch with next steps. Thank you!`;
  return encodeWA(phone, message);
}

// Collector/Vendor — Item shipped
export function buildItemShippedLink(params: {
  phone: string;
  buyerName: string;
  sealId: string;
  storeName: string;
  trackingInfo?: string;
}): string {
  const { phone, buyerName, sealId, storeName, trackingInfo } = params;
  const tracking = trackingInfo ? `\n\nTracking info: ${trackingInfo}` : '';
  const message = `Hi ${buyerName}! 📦 Your order from ${storeName} has been shipped.\n\nOrder ref: ${sealId}${tracking}\n\nPlease let us know when it arrives.`;
  return encodeWA(phone, message);
}

// Host — Appointment reminder (sent manually, ~24h before)
export function buildAppointmentReminderLink(params: {
  phone: string;
  buyerName: string;
  serviceName: string;
  appointmentTime: string;   // formatted string e.g. "Thursday 27 March at 10:00am"
  storeName: string;
  arrivalNote?: string | null;
}): string {
  const { phone, buyerName, serviceName, appointmentTime, storeName, arrivalNote } = params;
  const note = arrivalNote ? `\n\n${arrivalNote}` : '';
  const message = `Hi ${buyerName}! Just a reminder: your ${serviceName} appointment with ${storeName} is tomorrow — ${appointmentTime}.${note}\n\nSee you then! 💫`;
  return encodeWA(phone, message);
}

// Studio/Host — Balance due reminder
export function buildBalanceDueLink(params: {
  phone: string;
  buyerName: string;
  projectName: string;
  balanceAmount: number;
  storeName: string;
}): string {
  const { phone, buyerName, projectName, balanceAmount, storeName } = params;
  const message = `Hi ${buyerName}! A quick note from ${storeName}: the balance of ${formatCurrency(balanceAmount)} for your ${projectName} project is now due.\n\nKindly make payment to complete the project. Thank you!`;
  return encodeWA(phone, message);
}

// Collector — Hold expiry warning
export function buildHoldExpiryLink(params: {
  phone: string;
  buyerName: string;
  itemName: string;
  expiresIn: string;   // e.g. "2 hours"
  storeName: string;
}): string {
  const { phone, buyerName, itemName, expiresIn, storeName } = params;
  const message = `Hi ${buyerName}! Your hold on "${itemName}" at ${storeName} expires in ${expiresIn}.\n\nIf you'd like to complete your purchase, please pay before your hold is released. Reply here if you need help.`;
  return encodeWA(phone, message);
}

// Host — Booking request (buyer to merchant)
export function buildBookingRequestLink(params: {
  phone: string;
  storeName: string;
  serviceName: string;
  date: string;
  time: string;
  deposit: number;
  buyerName: string;
}): string {
  const { phone, storeName, serviceName, date, time, deposit, buyerName } = params;
  const message = `Hi ${storeName}! I'd like to book ${serviceName}.\n\nDate: ${date}\nTime: ${time}\n\nMy name is ${buyerName}. I understand a deposit of ${formatCurrency(deposit)} is required to confirm.`;
  return encodeWA(phone, message);
}

// Studio — Professional Project Enquiry
export function buildStudioEnquiryLink(params: {
  phone: string;
  storeName: string;
  projectName: string;
  clientName: string;
  company?: string;
  budget?: string;
  timeline?: string;
  message: string;
}): string {
  const { phone, storeName, projectName, clientName, company, budget, timeline, message } = params;
  
  const content = [
    `*NEW ENQUIRY: ${storeName}*`,
    `Project: ${projectName}`,
    '---',
    `Client: ${clientName}${company ? ` (${company})` : ''}`,
    budget ? `Budget: ${budget}` : '',
    timeline ? `Timeline: ${timeline}` : '',
    '',
    `*Message:*`,
    message,
    '',
    'Reply to this message to initiate consultation. 🖋️',
  ].filter(Boolean).join('\n');

  return encodeWA(phone, content);
}

// Vendor — Notify me when window opens
export function buildVendorNotifyLink(phone: string, storeName: string): string {
  const message = `Hi ${storeName}, remind me when your next window opens 🍽️`;
  return encodeWA(phone, message);
}

// All types — Custom message (free-form, merchant fills in body)
export function buildCustomMessageLink(params: {
  phone: string;
  messageBody: string;
}): string {
  const { phone, messageBody } = params;
  return encodeWA(phone, messageBody);
}
