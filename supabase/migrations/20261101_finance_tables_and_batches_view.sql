-- Finanzas: settlements / ledgers / vista de lotes (compatible sin client_reference)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number TEXT UNIQUE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'paid', 'cancelled')),
  total_units INTEGER DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  units_scrapped INTEGER DEFAULT 0,
  units_pending INTEGER DEFAULT 0,
  gross_revenue NUMERIC(14,2) DEFAULT 0,
  scrap_revenue NUMERIC(14,2) DEFAULT 0,
  total_revenue NUMERIC(14,2) DEFAULT 0,
  acquisition_cost NUMERIC(14,2) DEFAULT 0,
  logistics_cost NUMERIC(12,2) DEFAULT 0,
  refurbishing_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  labor_cost NUMERIC(12,2) DEFAULT 0,
  data_wipe_cost NUMERIC(12,2) DEFAULT 0,
  storage_cost NUMERIC(12,2) DEFAULT 0,
  other_costs NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(14,2) DEFAULT 0,
  gross_profit NUMERIC(14,2) DEFAULT 0,
  operating_profit NUMERIC(14,2) DEFAULT 0,
  net_profit NUMERIC(14,2) DEFAULT 0,
  profit_margin_pct NUMERIC(5,2) DEFAULT 0,
  is_consignment BOOLEAN DEFAULT FALSE,
  supplier_payment NUMERIC(12,2) DEFAULT 0,
  our_commission NUMERIC(12,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  report_url TEXT,
  finalized_by UUID REFERENCES public.profiles(id),
  finalized_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES public.settlements(id) ON DELETE SET NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN (
    'acquisition', 'logistics', 'parts', 'labor',
    'data_wipe', 'storage', 'marketing', 'commission', 'other'
  )),
  description TEXT NOT NULL,
  reference_number TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'GTQ',
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC(10,2),
  expense_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.revenue_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  sale_order_id UUID,
  settlement_id UUID REFERENCES public.settlements(id) ON DELETE SET NULL,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN (
    'sale', 'scrap', 'parts_sale', 'service', 'other'
  )),
  description TEXT NOT NULL,
  reference_number TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'GTQ',
  revenue_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_all" ON public.settlements;
CREATE POLICY "settlements_all" ON public.settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "expense_ledger_all" ON public.expense_ledger;
CREATE POLICY "expense_ledger_all" ON public.expense_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "revenue_ledger_all" ON public.revenue_ledger;
CREATE POLICY "revenue_ledger_all" ON public.revenue_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.settlements TO anon, authenticated, service_role;
GRANT ALL ON public.expense_ledger TO anon, authenticated, service_role;
GRANT ALL ON public.revenue_ledger TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.batches_for_settlement AS
SELECT
  b.id,
  b.internal_batch_id,
  COALESCE(b.description, b.notes) AS client_reference,
  b.status::text AS batch_status,
  COALESCE(b.received_units, 0) AS received_units,
  b.created_at,
  COUNT(a.id) AS total_assets,
  COUNT(a.id) FILTER (WHERE a.status::text = 'sold') AS sold_count,
  COUNT(a.id) FILTER (WHERE a.status::text = 'scrapped') AS scrapped_count,
  COUNT(a.id) FILTER (WHERE a.status::text NOT IN ('sold', 'scrapped')) AS pending_count,
  CASE WHEN COUNT(a.id) > 0
    THEN ROUND((COUNT(a.id) FILTER (WHERE a.status::text IN ('sold', 'scrapped'))::NUMERIC / COUNT(a.id)) * 100, 1)
    ELSE 0
  END AS completion_pct,
  COALESCE(SUM(a.cost_amount), 0)::NUMERIC(12,2) AS total_cost,
  COALESCE(SUM(CASE WHEN a.status::text = 'sold' THEN COALESCE(a.sales_price, 0) ELSE 0 END), 0)::NUMERIC(12,2) AS total_sales,
  EXISTS(SELECT 1 FROM public.settlements s WHERE s.batch_id = b.id) AS has_settlement,
  (SELECT s.status FROM public.settlements s WHERE s.batch_id = b.id ORDER BY s.created_at DESC LIMIT 1) AS settlement_status
FROM public.batches b
LEFT JOIN public.assets a ON a.batch_id = b.id
WHERE b.status::text IN ('received', 'processing', 'completed')
GROUP BY b.id, b.internal_batch_id, b.description, b.notes, b.status, b.received_units, b.created_at
HAVING COUNT(a.id) > 0;

GRANT SELECT ON public.batches_for_settlement TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
