-- Add columns present in TS types but absent from 001 schema
ALTER TABLE trovea.merchants
  ADD COLUMN IF NOT EXISTS has_gone_live BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_seal_issued BOOLEAN NOT NULL DEFAULT false;

UPDATE trovea.merchants SET has_gone_live = true WHERE store_open = true;

-- Atomic stock decrement RPC (used by Phase 3C terminal)
CREATE OR REPLACE FUNCTION trovea.decrement_stock(p_product_id UUID, p_quantity INTEGER DEFAULT 1)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = trovea AS $$
BEGIN
  UPDATE trovea.products
  SET stock_level = GREATEST(0, stock_level - p_quantity),
      status = CASE WHEN GREATEST(0, stock_level - p_quantity) = 0 THEN 'sold_out' ELSE status END,
      updated_at = NOW()
  WHERE id = p_product_id AND stock_level IS NOT NULL AND stock_level > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION trovea.decrement_stock(UUID, INTEGER) TO authenticated;
