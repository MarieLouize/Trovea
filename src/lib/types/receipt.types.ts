export type ReceiptType = 'sale' | 'booking' | 'order' | 'download' | 'project';
export type PaymentStatus = 'pending_payment' | 'paid' | 'cancelled';
export type ShipmentStatus = 'not_started' | 'packed' | 'shipped' | 'received';
export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'opay'
  | 'palmpay'
  | 'moniepoint'
  | 'ussd'
  | 'other';

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
  receipt_type: ReceiptType;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_email: string | null;
  line_items: ReceiptLineItem[];
  subtotal: number;
  discount_amount: number;
  discount_type: 'flat' | 'percent' | null;
  discount: { type: 'flat' | 'percent'; value: number; applied_amount: number } | null;
  delivery_fee: number | null;
  total: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  shipment_status: ShipmentStatus;
  notes: string | null;
  log: ReceiptLogEntry[];
  is_quick_item: boolean;
  sale_note: string | null;
  fulfilment_type: 'pickup' | 'delivery' | null;
  order_type: 'preorder' | 'walkin' | null;
  delivery_status: 'pending' | 'sent' | 'failed' | 'manual_pending' | null;
  created_at: string;
  updated_at: string;
}
