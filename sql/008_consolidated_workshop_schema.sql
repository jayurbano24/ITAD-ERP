-- =====================================================
-- ITAD ERP Guatemala - Schema Consolidado Taller
-- Versión: 008 (Consolidado)
-- Fecha: 2025-12-03
-- Ejecutar en: Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: TABLA WORK_ORDERS (Crear o Actualizar)
-- =====================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_number TEXT NOT NULL UNIQUE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES operations_tickets(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'open',
    part_dispatch_completed BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'normal',
    reported_issue TEXT,
    diagnosis TEXT,
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Agregar columnas de Garantía
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warranty_status TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warranty_end_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS warranty_validated_at TIMESTAMPTZ;

-- Agregar flag que indica si ya hubo un despacho de pieza para la orden
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS part_dispatch_completed BOOLEAN DEFAULT FALSE;

-- Agregar columnas de Falla
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS failure_type TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS failure_category TEXT;

-- Agregar columnas de Cotización
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_status TEXT DEFAULT 'not_required';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_approved_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS quote_approved_by TEXT;

-- Agregar columnas de Irreparable
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_irreparable BOOLEAN DEFAULT FALSE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS irreparable_reason TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS irreparable_marked_at TIMESTAMPTZ;

-- Agregar columnas de Seedstock (Cambio de Unidad)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS seedstock_exchange BOOLEAN DEFAULT FALSE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS original_imei TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS new_imei TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS original_serial TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS new_serial TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS seedstock_date TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS seedstock_notes TEXT;

-- Agregar columnas de QC (Control de Calidad)
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mmi_test_in JSONB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS mmi_test_out JSONB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_passed BOOLEAN;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_performed_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_performed_by UUID REFERENCES profiles(id);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS qc_notes TEXT;

-- =====================================================
-- PARTE 2: TABLA PART_REQUESTS (Solicitudes de Piezas)
-- =====================================================

CREATE TABLE IF NOT EXISTS part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES profiles(id),
    part_sku TEXT NOT NULL,
    part_name TEXT,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    installed_at TIMESTAMPTZ
);

-- Agregar columnas de Retorno (Pieza Dañada)
ALTER TABLE part_requests ADD COLUMN IF NOT EXISTS returned_part_sku TEXT;
ALTER TABLE part_requests ADD COLUMN IF NOT EXISTS returned_part_serial TEXT;
ALTER TABLE part_requests ADD COLUMN IF NOT EXISTS returned_part_status TEXT DEFAULT 'not_applicable';
ALTER TABLE part_requests ADD COLUMN IF NOT EXISTS returned_part_condition TEXT;
ALTER TABLE part_requests ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE part_requests ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMPTZ;

-- =====================================================
-- PARTE 3: TABLA PARTS_CATALOG (Catálogo de Piezas)
-- =====================================================

CREATE TABLE IF NOT EXISTS parts_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    compatible_brands TEXT[],
    compatible_models TEXT[],
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    location TEXT,
    unit_cost NUMERIC(10,2),
    selling_price NUMERIC(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 4: TABLA BAD_WAREHOUSE_INVENTORY (Bodega Mala)
-- =====================================================

CREATE TABLE IF NOT EXISTS bad_warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL,
    part_name TEXT,
    quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'defective',
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    part_request_id UUID REFERENCES part_requests(id) ON DELETE SET NULL,
    original_serial TEXT,
    received_from TEXT,
    received_by UUID REFERENCES profiles(id),
    date_received TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    disposition TEXT DEFAULT 'stored',
    disposition_date TIMESTAMPTZ,
    disposition_notes TEXT,
    notes TEXT
);

-- =====================================================
-- PARTE 5: TABLA SEEDSTOCK_INVENTORY (Unidades Reemplazo)
-- =====================================================

CREATE TABLE IF NOT EXISTS seedstock_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei TEXT UNIQUE,
    serial_number TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT,
    storage_capacity TEXT,
    status TEXT DEFAULT 'available',
    condition TEXT DEFAULT 'refurbished',
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    dispatched_at TIMESTAMPTZ,
    dispatched_by UUID REFERENCES profiles(id),
    warehouse_location TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 6: TABLA INVENTORY_MOVEMENTS (Movimientos)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    item_sku TEXT,
    quantity INTEGER NOT NULL,
    work_order_id UUID REFERENCES work_orders(id),
    reference_number TEXT,
    performed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 7: ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_warranty ON work_orders(warranty_status);

-- part_requests
CREATE INDEX IF NOT EXISTS idx_part_requests_work_order ON part_requests(work_order_id);
CREATE INDEX IF NOT EXISTS idx_part_requests_status ON part_requests(status);

-- parts_catalog
CREATE INDEX IF NOT EXISTS idx_parts_catalog_sku ON parts_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_parts_catalog_stock ON parts_catalog(stock_quantity);

-- bad_warehouse_inventory
CREATE INDEX IF NOT EXISTS idx_bad_warehouse_sku ON bad_warehouse_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_bad_warehouse_work_order ON bad_warehouse_inventory(work_order_id);

-- seedstock_inventory
CREATE INDEX IF NOT EXISTS idx_seedstock_imei ON seedstock_inventory(imei);
CREATE INDEX IF NOT EXISTS idx_seedstock_status ON seedstock_inventory(status);
CREATE INDEX IF NOT EXISTS idx_seedstock_brand_model ON seedstock_inventory(brand, model);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_item ON inventory_movements(item_type, item_id);

-- =====================================================
-- PARTE 8: HABILITAR RLS
-- =====================================================

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE bad_warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE seedstock_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 9: POLÍTICAS RLS (Acceso Autenticado)
-- =====================================================

-- work_orders
DROP POLICY IF EXISTS "work_orders_all" ON work_orders;
CREATE POLICY "work_orders_all" ON work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- part_requests
DROP POLICY IF EXISTS "part_requests_all" ON part_requests;
CREATE POLICY "part_requests_all" ON part_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- parts_catalog
DROP POLICY IF EXISTS "parts_catalog_all" ON parts_catalog;
CREATE POLICY "parts_catalog_all" ON parts_catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- bad_warehouse_inventory
DROP POLICY IF EXISTS "bad_warehouse_all" ON bad_warehouse_inventory;
CREATE POLICY "bad_warehouse_all" ON bad_warehouse_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- seedstock_inventory
DROP POLICY IF EXISTS "seedstock_all" ON seedstock_inventory;
CREATE POLICY "seedstock_all" ON seedstock_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- inventory_movements
DROP POLICY IF EXISTS "movements_all" ON inventory_movements;
CREATE POLICY "movements_all" ON inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- RESUMEN DE TABLAS:
-- ✅ work_orders - Órdenes de trabajo con campos de garantía, cotización, seedstock, QC
-- ✅ part_requests - Solicitudes de piezas con retorno obligatorio
-- ✅ parts_catalog - Catálogo de piezas (stock bueno)
-- ✅ bad_warehouse_inventory - Bodega de piezas malas
-- ✅ seedstock_inventory - Unidades de reemplazo
-- ✅ inventory_movements - Trazabilidad de movimientos

