-- Consecutivo de política de garantía (POL-GT-AAAA-NNNNN)

CREATE TABLE IF NOT EXISTS public.warranty_policy_sequences (
  year INTEGER PRIMARY KEY,
  next_value INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.warranty_policy_prints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  exchange_id UUID REFERENCES public.sale_exchanges(id) ON DELETE SET NULL,
  print_kind TEXT NOT NULL DEFAULT 'initial'
    CHECK (print_kind IN ('initial', 'exchange_reprint')),
  exchange_from_serial TEXT,
  exchange_to_serial TEXT,
  exchange_reason TEXT,
  printed_by UUID REFERENCES public.profiles(id),
  printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_policy_prints_order
  ON public.warranty_policy_prints(order_id, printed_at DESC);

CREATE OR REPLACE FUNCTION public.next_warranty_policy_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  y INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  n INTEGER;
BEGIN
  INSERT INTO public.warranty_policy_sequences (year, next_value)
  VALUES (y, 2)
  ON CONFLICT (year) DO UPDATE
    SET next_value = public.warranty_policy_sequences.next_value + 1
  RETURNING next_value - 1 INTO n;

  RETURN 'POL-GT-' || y::TEXT || '-' || LPAD(n::TEXT, 5, '0');
END;
$$;

COMMENT ON TABLE public.warranty_policy_prints IS 'Cada impresión/emisión de política de garantía con número consecutivo';
