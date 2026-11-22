ALTER TABLE public.operations_tickets
  ADD COLUMN IF NOT EXISTS reception_missing_notes text,
  ADD COLUMN IF NOT EXISTS reception_additional_notes text;

COMMENT ON COLUMN public.operations_tickets.reception_missing_notes IS
  'Comentarios al cerrar recepción si faltan equipos del Receipt of Equipment.';
COMMENT ON COLUMN public.operations_tickets.reception_additional_notes IS
  'Comentarios sobre series/equipos adicionales no listados en el recibo.';