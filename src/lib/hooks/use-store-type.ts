import { useMerchantStore } from '@/lib/store/merchant.store';
import type { StoreType } from '@/lib/types';

export interface StoreTypeContext {
  type: StoreType;
  isCollector: boolean;
  isVendor: boolean;
  isHost: boolean;
  isDigital: boolean;
  isStudio: boolean;
  // Adaptive labels
  itemLabel: string;
  itemsLabel: string;
  archiveLabel: string;
  receiptLabel: string;
  receiptHeading: string;
  primaryCta: string;
}

export function useStoreType(): StoreTypeContext {
  const type = useMerchantStore((s) => s.merchant.store_type);

  const isCollector = type === 'collector';
  const isVendor    = type === 'vendor';
  const isHost      = type === 'host';
  const isDigital   = type === 'digital_creator';
  const isStudio    = type === 'studio';

  const itemLabel =
    isCollector ? 'Item' :
    isVendor    ? 'Menu Item' :
    isHost      ? 'Service' :
    isDigital   ? 'Product' :
    isStudio    ? 'Package' :
    'Item';

  const itemsLabel =
    isCollector ? 'Items' :
    isVendor    ? 'Menu Items' :
    isHost      ? 'Services' :
    isDigital   ? 'Products' :
    isStudio    ? 'Packages' :
    'Items';

  const archiveLabel =
    isCollector ? 'Archive' :
    isVendor    ? 'Menu' :
    isHost      ? 'Services' :
    isDigital   ? 'Catalogue' :
    isStudio    ? 'Services' :
    'Archive';

  const receiptLabel =
    isCollector ? 'Receipt' :
    isVendor    ? 'Order' :
    isHost      ? 'Booking' :
    isDigital   ? 'Purchase' :
    isStudio    ? 'Project' :
    'Receipt';

  const receiptHeading =
    isCollector ? 'Receipt' :
    isVendor    ? 'Order Receipt' :
    isHost      ? 'Booking Confirmation' :
    isDigital   ? 'Purchase Receipt' :
    isStudio    ? 'Project Brief' :
    'Receipt';

  const primaryCta =
    isCollector ? 'Chat to Buy' :
    isVendor    ? 'Pre-order' :
    isHost      ? 'Book a Slot' :
    isDigital   ? 'Buy Now' :
    isStudio    ? 'Book Package' :
    'Chat to Buy';

  return {
    type,
    isCollector,
    isVendor,
    isHost,
    isDigital,
    isStudio,
    itemLabel,
    itemsLabel,
    archiveLabel,
    receiptLabel,
    receiptHeading,
    primaryCta,
  };
}
