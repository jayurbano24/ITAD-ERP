ALTER TABLE public.sales_quotations
  ADD COLUMN IF NOT EXISTS recipient_email TEXT;

COMMENT ON COLUMN public.sales_quotations.recipient_email IS 'Correo al que se enviará la cotización';
