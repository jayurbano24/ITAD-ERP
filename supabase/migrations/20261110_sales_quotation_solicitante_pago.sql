-- Solicitante (empresa + contacto o cliente final) y método de pago

ALTER TABLE public.sales_quotations
  ADD COLUMN IF NOT EXISTS solicitante_tipo TEXT
    CHECK (solicitante_tipo IN ('empresa', 'cliente_final')),
  ADD COLUMN IF NOT EXISTS solicitante_empresa TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_contacto TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('tarjeta', 'transferencia', 'deposito', 'credito'));

COMMENT ON COLUMN public.sales_quotations.solicitante_tipo IS 'Quién solicitó la cotización: empresa o cliente final';
COMMENT ON COLUMN public.sales_quotations.solicitante_empresa IS 'Nombre de empresa solicitante';
COMMENT ON COLUMN public.sales_quotations.solicitante_contacto IS 'Contacto dentro de la empresa';
COMMENT ON COLUMN public.sales_quotations.payment_method IS 'Método de pago propuesto: tarjeta, transferencia, deposito, credito';
