-- Diferencia de precio en reemplazo por garantía (upgrade)

ALTER TABLE public.sale_exchanges
  ADD COLUMN IF NOT EXISTS upgrade_subtotal NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sale_exchanges
  ADD COLUMN IF NOT EXISTS upgrade_tax NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sale_exchanges
  ADD COLUMN IF NOT EXISTS upgrade_total NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sale_exchanges
  ADD COLUMN IF NOT EXISTS upgrade_payment_method TEXT;

COMMENT ON COLUMN public.sale_exchanges.upgrade_total IS 'Monto adicional cobrado al cliente por equipo de mayor valor (incluye IVA)';
