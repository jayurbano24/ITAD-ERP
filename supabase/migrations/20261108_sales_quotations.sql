-- Cotizaciones de ventas: aprobación, seguimiento y adjunto aprobado

CREATE TABLE IF NOT EXISTS public.sales_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.crm_entities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'pendiente_aprobacion'
    CHECK (status IN ('pendiente_aprobacion', 'aprobada', 'rechazada', 'aceptada')),
  rejection_reason TEXT,
  approved_attachment_url TEXT,
  approved_attachment_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sales_quotations_quote_number_key UNIQUE (quote_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_quotations_status ON public.sales_quotations (status);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_customer ON public.sales_quotations (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_quotations_created_at ON public.sales_quotations (created_at DESC);

CREATE TABLE IF NOT EXISTS public.sales_quotation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.sales_quotations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_quotation_comments_quotation
  ON public.sales_quotation_comments (quotation_id, created_at ASC);

CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  IF NEW.quote_number IS NOT NULL AND btrim(NEW.quote_number) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(
    CAST(substring(quote_number from '^COT-([0-9]+)$') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.sales_quotations
  WHERE quote_number ~ '^COT-[0-9]+$';

  NEW.quote_number := 'COT-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_quotations_quote_number ON public.sales_quotations;
CREATE TRIGGER trg_sales_quotations_quote_number
  BEFORE INSERT ON public.sales_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_quotation_number();

ALTER TABLE public.sales_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_quotations_all ON public.sales_quotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY sales_quotation_comments_all ON public.sales_quotation_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-quotation-attachments', 'sales-quotation-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY sales_quotation_attachments_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sales-quotation-attachments');

CREATE POLICY sales_quotation_attachments_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'sales-quotation-attachments');

CREATE POLICY sales_quotation_attachments_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sales-quotation-attachments')
  WITH CHECK (bucket_id = 'sales-quotation-attachments');

COMMENT ON TABLE public.sales_quotations IS 'Cotizaciones comerciales con flujo de aprobación';
COMMENT ON TABLE public.sales_quotation_comments IS 'Comentarios de seguimiento por cotización';
