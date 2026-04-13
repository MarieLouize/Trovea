export type ReceiptPaymentStatus = 'pending_payment' | 'paid' | 'cancelled';
export type ShipmentStatus = 'not_started' | 'packed' | 'shipped' | 'received';
export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'opay'
  | 'palmpay'
  | 'moniepoint'
  | 'ussd';

export interface ReceiptLineItem {
  product_id: string | null;
  name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ReceiptLogEntry {
  id: string;
  event: string;
  timestamp: string;
  actor: 'merchant' | 'system' | 'buyer';
}

export interface Receipt {
  id: string;
  merchant_id: string;
  seal_id: string;
  buyer_name: string;
  buyer_phone: string | null;
  line_items: ReceiptLineItem[];
  subtotal: number;
  discount_amount: number;
  discount_type: 'flat' | 'percent' | null;
  total: number;
  payment_status: ReceiptPaymentStatus;
  payment_method: PaymentMethod | null;
  shipment_status: ShipmentStatus;
  notes: string | null;
  log: ReceiptLogEntry[];
  is_quick_item: boolean;
  created_at: string;
  updated_at: string;
}