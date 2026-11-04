-- Completar part_requests + bad_warehouse_inventory (schema cache / embeds)
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS requested_by UUID;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS returned_part_sku TEXT;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS returned_part_serial TEXT;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS returned_part_status TEXT DEFAULT 'not_applicable';
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS returned_part_condition TEXT;
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'part_requests_requested_by_fkey'
  ) THEN
    ALTER TABLE public.part_requests
      ADD CONSTRAINT part_requests_requested_by_fkey
      FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bad_warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  part_name TEXT,
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'defective',
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  part_request_id UUID REFERENCES public.part_requests(id) ON DELETE SET NULL,
  original_serial TEXT,
  received_from TEXT,
  received_by UUID REFERENCES public.profiles(id),
  date_received TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  disposition TEXT DEFAULT 'stored',
  disposition_date TIMESTAMPTZ,
  disposition_notes TEXT,
  notes TEXT
);

ALTER TABLE public.bad_warehouse_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bad_warehouse_all" ON public.bad_warehouse_inventory;
CREATE POLICY "bad_warehouse_all" ON public.bad_warehouse_inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.part_requests TO anon, authenticated, service_role;
GRANT ALL ON public.bad_warehouse_inventory TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
