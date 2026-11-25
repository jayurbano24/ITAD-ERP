-- Línea anulada (sin devolución de dinero), distinta de reembolsada.

ALTER TABLE public.sales_order_items
  DROP CONSTRAINT IF EXISTS sales_order_items_line_status_check;

ALTER TABLE public.sales_order_items
  ADD CONSTRAINT sales_order_items_line_status_check
  CHECK (line_status IN ('active', 'refunded', 'voided'));

COMMENT ON COLUMN public.sales_order_items.line_status IS 'active | refunded (devolución de dinero) | voided (anulación sin cobro)';