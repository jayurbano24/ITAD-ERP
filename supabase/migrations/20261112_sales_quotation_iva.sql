ALTER TABLE public.sales_quotations
  ADD COLUMN IF NOT EXISTS prices_include_iva BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2);

COMMENT ON COLUMN public.sales_quotations.prices_include_iva IS 'true = precios digitados ya incluyen IVA 12%';
COMMENT ON COLUMN public.sales_quotations.subtotal IS 'Base sin IVA';
COMMENT ON COLUMN public.sales_quotations.tax_amount IS 'IVA 12%';
