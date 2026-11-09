-- Líneas de equipo y montos por cotización

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

ALTER TABLE public.sales_quotation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_quotation_items_all ON public.sales_quotation_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.sales_quotation_items IS 'Detalle de equipos y montos en cotizaciones';
