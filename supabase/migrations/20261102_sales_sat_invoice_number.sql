-- Número de factura electrónica / FEL (SAT Guatemala), distinto del invoice interno POS
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS sat_invoice_number TEXT;

CREATE INDEX IF NOT EXISTS idx_sales_orders_sat_invoice
  ON public.sales_orders (sat_invoice_number)
  WHERE sat_invoice_number IS NOT NULL;

COMMENT ON COLUMN public.sales_orders.sat_invoice_number IS 'Número de factura emitida ante SAT (FEL/DTE)';
