-- Post-venta: reemplazo por garantía y devolución de dinero

ALTER TABLE public.sales_orders
  DROP CONSTRAINT IF EXISTS sales_orders_status_check;

ALTER TABLE public.sales_orders
  ADD CONSTRAINT sales_orders_status_check
  CHECK (status IN (
    'draft', 'confirmed', 'paid', 'shipped', 'delivered',
    'cancelled', 'partially_refunded', 'refunded'
  ));

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'active'
  CHECK (line_status IN ('active', 'refunded'));

ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.sale_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES public.sales_order_items(id) ON DELETE RESTRICT,
  from_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  to_asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  from_serial TEXT,
  to_serial TEXT,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_exchanges_order ON public.sale_exchanges(order_id);
CREATE INDEX IF NOT EXISTS idx_sale_exchanges_item ON public.sale_exchanges(order_item_id);

CREATE TABLE IF NOT EXISTS public.sale_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  order_item_id UUID REFERENCES public.sales_order_items(id) ON DELETE SET NULL,
  refund_amount NUMERIC(12,2) NOT NULL,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_method TEXT,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_refunds_order ON public.sale_refunds(order_id);

COMMENT ON TABLE public.sale_exchanges IS 'Cambio de serie en garantía sobre la misma venta (sin nueva facturación)';
COMMENT ON TABLE public.sale_refunds IS 'Devolución de dinero ligada a venta o línea';
