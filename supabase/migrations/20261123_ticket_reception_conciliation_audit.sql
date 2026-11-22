-- Auditoría recepción: documentos Receipt, eventos de escaneo, snapshot conciliación

DO $$ BEGIN
  ALTER TYPE public.ticket_validation_status ADD VALUE 'DISCREPANCIA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.ticket_equipment_receipt_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.operations_tickets(id) ON DELETE CASCADE,
  storage_path TEXT,
  public_url TEXT,
  file_name TEXT NOT NULL,
  content_type TEXT,
  ocr_text TEXT,
  ocr_confidence JSONB,
  parsed_payload JSONB,
  import_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (import_status IN ('pending_review', 'confirmed', 'rejected')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_receipt_documents_ticket
  ON public.ticket_equipment_receipt_documents(ticket_id);

COMMENT ON TABLE public.ticket_equipment_receipt_documents IS
  'Receipt of Equipment adjuntos por ticket; OCR y revisión antes de confirmar manifiesto.';

CREATE TABLE IF NOT EXISTS public.ticket_reception_scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.operations_tickets(id) ON DELETE CASCADE,
  ticket_item_id UUID REFERENCES public.ticket_items(id) ON DELETE SET NULL,
  receipt_document_id UUID REFERENCES public.ticket_equipment_receipt_documents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'scan_exact_match',
      'scan_mismatch',
      'scan_duplicate',
      'scan_foreign_ticket',
      'scan_reassign',
      'scan_additional',
      'scan_cancelled'
    )
  ),
  scanned_serial TEXT NOT NULL,
  expected_serial TEXT,
  corrected_serial TEXT,
  justification TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_reception_scan_events_ticket
  ON public.ticket_reception_scan_events(ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_reception_scan_events_serial
  ON public.ticket_reception_scan_events(upper(scanned_serial));

COMMENT ON TABLE public.ticket_reception_scan_events IS
  'Trazabilidad de pistoleo: serie escaneada, esperada, correcciones y autorizaciones.';

CREATE TABLE IF NOT EXISTS public.ticket_reception_conciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES public.operations_tickets(id) ON DELETE CASCADE,
  expected_count INT NOT NULL DEFAULT 0,
  received_count INT NOT NULL DEFAULT 0,
  missing_count INT NOT NULL DEFAULT 0,
  additional_count INT NOT NULL DEFAULT 0,
  discrepancy_count INT NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.ticket_reception_conciliation IS
  'Snapshot al cerrar recepción: esperados vs recibidos vs faltantes/adicionales/discrepancias.';

-- Concurrencia: un escaneo por serie+ticker por transacción
CREATE OR REPLACE FUNCTION public.reception_try_serial_lock(p_ticket_id UUID, p_serial TEXT)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
  SELECT pg_try_advisory_xact_lock(
    hashtext(p_ticket_id::text || ':' || upper(trim(p_serial)))
  );
$$;

COMMENT ON FUNCTION public.reception_try_serial_lock IS
  'Evita doble registro concurrente de la misma serie en un ticket.';