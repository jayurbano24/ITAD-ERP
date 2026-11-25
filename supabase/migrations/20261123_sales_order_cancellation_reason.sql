ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sales_orders.cancelled_reason IS 'Motivo registrado al anular la venta completa (void sale).';
COMMENT ON COLUMN public.sales_orders.cancelled_at IS 'Fecha/hora de anulación de la venta.';