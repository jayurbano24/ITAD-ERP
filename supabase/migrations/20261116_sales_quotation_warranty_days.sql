-- Bootstrap cotizaciones (si el proyecto aún no tenía sales_quotations) + warranty_days
-- Seguro de re-ejecutar: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- —— Tabla base ——
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

CREATE TABLE IF NOT EXISTS public.sales_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.sales_quotations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  condition TEXT,
  asset_type TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_quotation_items_quotation
  ON public.sales_quotation_items (quotation_id, sort_order);

CREATE TABLE IF NOT EXISTS public.sales_quotation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.sales_quotations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_quotation_comments_quotation
  ON public.sales_quotation_comments (quotation_id, created_at ASC);

-- —— Columnas posteriores (módulo cotizaciones) ——
ALTER TABLE public.sales_quotations
  ADD COLUMN IF NOT EXISTS solicitante_tipo TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_empresa TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_contacto TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS prices_include_iva BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_note TEXT,
  ADD COLUMN IF NOT EXISTS warranty_days INTEGER NOT NULL DEFAULT 90;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_quotations_warranty_days_range'
  ) THEN
    ALTER TABLE public.sales_quotations
      ADD CONSTRAINT sales_quotations_warranty_days_range
      CHECK (warranty_days >= 1 AND warranty_days <= 730);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.sales_quotation_comments
  ADD COLUMN IF NOT EXISTS comment_type TEXT NOT NULL DEFAULT 'seguimiento',
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- —— Numeración COT-00001 ——
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

-- —— RLS ——
ALTER TABLE public.sales_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_quotation_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_quotations_all ON public.sales_quotations;
CREATE POLICY sales_quotations_all ON public.sales_quotations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_quotation_items_all ON public.sales_quotation_items;
CREATE POLICY sales_quotation_items_all ON public.sales_quotation_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_quotation_comments_all ON public.sales_quotation_comments;
CREATE POLICY sales_quotation_comments_all ON public.sales_quotation_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- —— Storage adjuntos (opcional; ignora si no hay permisos en buckets) ——
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-quotation-attachments', 'sales-quotation-attachments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS sales_quotation_attachments_insert ON storage.objects;
CREATE POLICY sales_quotation_attachments_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sales-quotation-attachments');

DROP POLICY IF EXISTS sales_quotation_attachments_select ON storage.objects;
CREATE POLICY sales_quotation_attachments_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'sales-quotation-attachments');

DROP POLICY IF EXISTS sales_quotation_attachments_update ON storage.objects;
CREATE POLICY sales_quotation_attachments_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sales-quotation-attachments')
  WITH CHECK (bucket_id = 'sales-quotation-attachments');

COMMENT ON TABLE public.sales_quotations IS 'Cotizaciones comerciales con flujo de aprobación';
COMMENT ON COLUMN public.sales_quotations.warranty_days IS 'Días de garantía propuestos (anexo política PDF)';
