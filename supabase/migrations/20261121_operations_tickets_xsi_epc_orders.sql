ALTER TABLE public.operations_tickets
  ADD COLUMN IF NOT EXISTS xsi_order_number TEXT,
  ADD COLUMN IF NOT EXISTS epc_order_number TEXT;

COMMENT ON COLUMN public.operations_tickets.xsi_order_number IS
  'Número de orden / referencia en sistema XSi (ITAD).';
COMMENT ON COLUMN public.operations_tickets.epc_order_number IS
  'Número de orden / referencia EPC asociada a la recolección.';