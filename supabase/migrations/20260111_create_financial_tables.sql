-- Migration: Create Financial Tables
-- Purpose: Create settlements, expense_ledger, and revenue_ledger tables

-- 1. Tabla settlements (Liquidaciones)
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_number TEXT UNIQUE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
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
    finalized_by UUID REFERENCES profiles(id),
    finalized_at TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla expense_ledger (Libro de Gastos)
CREATE TABLE IF NOT EXISTS expense_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
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
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla revenue_ledger (Libro de Ingresos)
CREATE TABLE IF NOT EXISTS revenue_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    sale_order_id UUID,
    settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
    revenue_type TEXT NOT NULL CHECK (revenue_type IN (
        'sale', 'scrap', 'parts_sale', 'service', 'other'
    )),
    description TEXT NOT NULL,
    reference_number TEXT,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'GTQ',
    revenue_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_settlements_batch ON settlements(batch_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_expenses_batch ON expense_ledger(batch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expense_ledger(expense_type);
CREATE INDEX IF NOT EXISTS idx_revenue_batch ON revenue_ledger(batch_id);

-- 5. RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_all" ON settlements;
CREATE POLICY "settlements_all" ON settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "expense_ledger_all" ON expense_ledger;
CREATE POLICY "expense_ledger_all" ON expense_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "revenue_ledger_all" ON revenue_ledger;
CREATE POLICY "revenue_ledger_all" ON revenue_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Trigger para número de liquidación
CREATE OR REPLACE FUNCTION generate_settlement_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.settlement_number IS NULL THEN
        NEW.settlement_number := 'LIQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
            LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(settlement_number FROM '\d+$') AS INTEGER)), 0) + 1 
                  FROM settlements)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settlements_generate_number ON settlements;
CREATE TRIGGER settlements_generate_number
    BEFORE INSERT ON settlements FOR EACH ROW
    EXECUTE FUNCTION generate_settlement_number();
