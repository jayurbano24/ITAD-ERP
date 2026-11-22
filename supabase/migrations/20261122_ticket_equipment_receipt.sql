-- Recibo de equipos: notas impresas y PDF firmado subido
ALTER TABLE public.operations_tickets
  ADD COLUMN IF NOT EXISTS equipment_receipt_notes text,
  ADD COLUMN IF NOT EXISTS signed_receipt_url text,
  ADD COLUMN IF NOT EXISTS signed_receipt_name text;

COMMENT ON COLUMN public.operations_tickets.equipment_receipt_notes IS
  'Notas para imprimir en Receipt of Equipment (faltantes, extras, aclaraciones).';
COMMENT ON COLUMN public.operations_tickets.signed_receipt_url IS
  'URL en storage del recibo firmado escaneado.';
COMMENT ON COLUMN public.operations_tickets.signed_receipt_name IS
  'Nombre original del archivo del recibo firmado.';