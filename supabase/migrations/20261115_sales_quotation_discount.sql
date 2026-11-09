ALTER TABLE public.sales_quotations
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_note TEXT;

COMMENT ON COLUMN public.sales_quotations.discount_percent IS 'Descuento % sobre subtotal sin IVA (0–100); mutuamente excluyente con discount_amount';
COMMENT ON COLUMN public.sales_quotations.discount_amount IS 'Descuento fijo en GTQ sobre subtotal sin IVA';
COMMENT ON COLUMN public.sales_quotations.discount_note IS 'Motivo o nota del descuento';
