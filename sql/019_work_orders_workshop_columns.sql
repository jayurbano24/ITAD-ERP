-- =====================================================
-- ITAD ERP Guatemala - Completar columnas work_orders
-- Versión: 019
-- Motivo: PostgREST error "column work_orders.reported_issue does not exist"
-- =====================================================

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES operations_tickets(id) ON DELETE SET NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reported_issue TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS part_dispatch_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warranty_status TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warranty_end_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warranty_validated_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS failure_type TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS failure_category TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'not_required';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_approved_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_approved_by TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_irreparable BOOLEAN DEFAULT FALSE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS irreparable_reason TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS irreparable_marked_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS seedstock_exchange BOOLEAN DEFAULT FALSE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS original_imei TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS new_imei TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS original_serial TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS new_serial TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS seedstock_date TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS seedstock_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mmi_test_in JSONB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mmi_test_out JSONB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_passed BOOLEAN;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_performed_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_performed_by UUID REFERENCES profiles(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_notes TEXT;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders'
      AND column_name = 'priority' AND data_type = 'integer'
  ) THEN
    ALTER TABLE work_orders ALTER COLUMN priority DROP DEFAULT;
    ALTER TABLE work_orders ALTER COLUMN priority TYPE TEXT USING COALESCE(priority::text, 'normal');
    ALTER TABLE work_orders ALTER COLUMN priority SET DEFAULT 'normal';
  END IF;
END $$;

COMMENT ON COLUMN work_orders.reported_issue IS 'Problema reportado al crear la OS';
