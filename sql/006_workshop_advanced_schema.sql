-- =====================================================
-- ITAD ERP Guatemala - Esquema Avanzado de Taller
-- Versión: 006
-- Fecha: 2025-12-03
-- Descripción: Soporte para validación de garantía, 
--              cotizaciones, seedstock, QC y bodega mala
-- =====================================================

-- =====================================================
-- PARTE 1: CREAR/ACTUALIZAR ENUMS
-- =====================================================

-- 1.1 Crear ENUM para estado de garantía
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warranty_status_type') THEN
        CREATE TYPE warranty_status_type AS ENUM (
            'in_warranty',      -- En garantía
            'out_of_warranty',  -- Fuera de garantía
            'pending_validation' -- Pendiente de validación
        );
        RAISE NOTICE 'ENUM warranty_status_type creado';
    ELSE
        RAISE NOTICE 'ENUM warranty_status_type ya existe';
    END IF;
END $$;

-- 1.2 Crear ENUM para estado de cotización
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status_type') THEN
        CREATE TYPE quote_status_type AS ENUM (
            'not_required',  -- No requiere cotización (en garantía)
            'pending',       -- Cotización pendiente de aprobación
            'approved',      -- Cotización aprobada
            'rejected'       -- Cotización rechazada
        );
        RAISE NOTICE 'ENUM quote_status_type creado';
    ELSE
        RAISE NOTICE 'ENUM quote_status_type ya existe';
    END IF;
END $$;

-- 1.3 Crear ENUM para estado de pieza retornada
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'returned_part_status_type') THEN
        CREATE TYPE returned_part_status_type AS ENUM (
            'not_applicable',   -- No aplica retorno
            'pending_return',   -- Pendiente de retorno
            'returned',         -- Retornada a bodega mala
            'disposed'          -- Desechada
        );
        RAISE NOTICE 'ENUM returned_part_status_type creado';
    ELSE
        RAISE NOTICE 'ENUM returned_part_status_type ya existe';
    END IF;
END $$;


DO $$ 
BEGIN
    -- Primero verificar si el tipo existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_order_status') THEN
        -- Crear el tipo completo si no existe
        CREATE TYPE work_order_status AS ENUM (
            'open',
            'in_progress',
            'waiting_parts',
            'waiting_quote',
            'quote_approved',
            'quote_rejected',
            'waiting_seedstock',
            'qc_pending',
            'qc_passed',
            'qc_failed',
            'ready_to_ship',
            'completed',
            'cancelled'
        );
        RAISE NOTICE 'ENUM work_order_status creado con todos los valores';
    ELSE
        RAISE NOTICE 'ENUM work_order_status ya existe, agregando nuevos valores...';
    END IF;
END $$;
    -- 1.5 Crear ENUM para clasificación REC/ C/ F (para uso en órdenes de taller)
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_workshop_classification') THEN
            CREATE TYPE asset_workshop_classification AS ENUM (
                'REC',
                'C',
                'F'
            );
            RAISE NOTICE 'ENUM asset_workshop_classification creado';
        ELSE
            RAISE NOTICE 'ENUM asset_workshop_classification ya existe';
        END IF;
    END $$;

ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'quote_rejected';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'waiting_parts';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'waiting_seedstock';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'qc_pending';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'qc_passed';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'qc_failed';
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'ready_to_ship';

-- =====================================================
-- PARTE 2: CREAR TABLA work_orders SI NO EXISTE
-- =====================================================

CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    work_order_number TEXT NOT NULL UNIQUE,
    
    -- Relaciones
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    ticket_id UUID REFERENCES operations_tickets(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Estado
    status work_order_status DEFAULT 'open',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        rec_classification asset_workshop_classification DEFAULT 'REC',
    
    -- Descripción del problema
    reported_issue TEXT,
    diagnosis TEXT,
    resolution TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- =====================================================
-- PARTE 3: AGREGAR COLUMNAS A work_orders
-- =====================================================

-- 3.1 Campos de Garantía
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS warranty_status warranty_status_type DEFAULT 'pending_validation';

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS warranty_end_date DATE;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS warranty_validated_at TIMESTAMPTZ;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS warranty_validated_by UUID REFERENCES profiles(id);

-- 3.2 Campos de Falla
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS failure_type TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS failure_category TEXT;

-- 3.3 Campos de Cotización (fuera de garantía)
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS quote_amount DECIMAL(10,2);

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS quote_status quote_status_type DEFAULT 'not_required';

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS quote_notes TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS quote_approved_at TIMESTAMPTZ;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS quote_approved_by TEXT;

-- 3.4 Campos de Irreparable
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS is_irreparable BOOLEAN DEFAULT FALSE;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS irreparable_reason TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS irreparable_marked_at TIMESTAMPTZ;

-- 3.5 Campos de Seedstock (Cambio de Unidad)
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS seedstock_exchange BOOLEAN DEFAULT FALSE;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS original_imei TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS new_imei TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS original_serial TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS new_serial TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS seedstock_date TIMESTAMPTZ;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS seedstock_notes TEXT;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS mmi_test_in JSONB;  -- Pruebas de entrada

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS mmi_test_out JSONB; -- Pruebas de salida

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_passed BOOLEAN;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_performed_at TIMESTAMPTZ;

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_performed_by UUID REFERENCES profiles(id);

ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS qc_notes TEXT;

-- 3.7 Campos de características técnicas y especificaciones del equipo
ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS screen_size TEXT;

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS ram_capacity_gb INTEGER CHECK (ram_capacity_gb >= 0);

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS ram_notes TEXT;

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS storage_type TEXT;

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS storage_capacity_gb INTEGER CHECK (storage_capacity_gb >= 0);

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS keyboard_language TEXT;

ALTER TABLE work_orders
ADD COLUMN IF NOT EXISTS keyboard_layout TEXT;
-- =====================================================
-- PARTE 4: CREAR/ACTUALIZAR TABLA part_requests
-- =====================================================

CREATE TABLE IF NOT EXISTS part_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES profiles(id),
    
    -- Información de la pieza solicitada
    part_sku TEXT NOT NULL,
    part_name TEXT,
    quantity INTEGER DEFAULT 1,
    
    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'ordered', 'received', 'installed', 'cancelled'
    )),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    installed_at TIMESTAMPTZ,
    
    -- Notas
    notes TEXT
);

-- 4.1 Agregar campos de pieza retornada (Bodega Mala)
ALTER TABLE part_requests 
ADD COLUMN IF NOT EXISTS returned_part_sku TEXT;

ALTER TABLE part_requests 
ADD COLUMN IF NOT EXISTS returned_part_serial TEXT;

ALTER TABLE part_requests 
ADD COLUMN IF NOT EXISTS returned_part_status returned_part_status_type DEFAULT 'not_applicable';

ALTER TABLE part_requests 
ADD COLUMN IF NOT EXISTS returned_part_condition TEXT;

ALTER TABLE part_requests 
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

ALTER TABLE part_requests 
ADD COLUMN IF NOT EXISTS returned_to_warehouse_id UUID;

-- =====================================================
-- PARTE 5: CREAR TABLA bad_warehouse_inventory
-- =====================================================

CREATE TABLE IF NOT EXISTS bad_warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información del SKU
    sku TEXT NOT NULL,
    part_name TEXT,
    
    -- Cantidad
    quantity INTEGER DEFAULT 1,
    
    -- Condición
    condition TEXT CHECK (condition IN (
        'defective',      -- Defectuoso
        'damaged',        -- Dañado
        'water_damage',   -- Daño por agua
        'broken_screen',  -- Pantalla rota
        'for_parts',      -- Para partes
        'unknown'         -- Desconocido
    )),
    
    -- Trazabilidad
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    part_request_id UUID REFERENCES part_requests(id) ON DELETE SET NULL,
    original_serial TEXT,
    
    -- Origen
    received_from TEXT, -- Cliente o proceso origen
    received_by UUID REFERENCES profiles(id),
    
    -- Timestamps
    date_received TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Disposición final
    disposition TEXT CHECK (disposition IN (
        'stored',         -- Almacenado
        'scrapped',       -- Desechado
        'returned_vendor',-- Retornado a proveedor
        'recycled'        -- Reciclado
    )) DEFAULT 'stored',
    disposition_date TIMESTAMPTZ,
    disposition_notes TEXT,
    
    -- Notas
    notes TEXT
);

-- =====================================================
-- PARTE 6: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_warranty_status ON work_orders(warranty_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_quote_status ON work_orders(quote_status);
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_id ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_technician_id ON work_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at DESC);

-- Índices para part_requests
CREATE INDEX IF NOT EXISTS idx_part_requests_work_order_id ON part_requests(work_order_id);
CREATE INDEX IF NOT EXISTS idx_part_requests_status ON part_requests(status);
CREATE INDEX IF NOT EXISTS idx_part_requests_returned_status ON part_requests(returned_part_status);

-- Índices para bad_warehouse_inventory
CREATE INDEX IF NOT EXISTS idx_bad_warehouse_sku ON bad_warehouse_inventory(sku);
CREATE INDEX IF NOT EXISTS idx_bad_warehouse_condition ON bad_warehouse_inventory(condition);
CREATE INDEX IF NOT EXISTS idx_bad_warehouse_work_order ON bad_warehouse_inventory(work_order_id);
CREATE INDEX IF NOT EXISTS idx_bad_warehouse_date ON bad_warehouse_inventory(date_received DESC);

-- =====================================================
-- PARTE 7: HABILITAR RLS Y POLÍTICAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bad_warehouse_inventory ENABLE ROW LEVEL SECURITY;

-- Políticas para work_orders
DROP POLICY IF EXISTS "work_orders_select_policy" ON work_orders;
CREATE POLICY "work_orders_select_policy" ON work_orders
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "work_orders_insert_policy" ON work_orders;
CREATE POLICY "work_orders_insert_policy" ON work_orders
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "work_orders_update_policy" ON work_orders;
CREATE POLICY "work_orders_update_policy" ON work_orders
    FOR UPDATE TO authenticated USING (true);

-- Políticas para part_requests
DROP POLICY IF EXISTS "part_requests_select_policy" ON part_requests;
CREATE POLICY "part_requests_select_policy" ON part_requests
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "part_requests_insert_policy" ON part_requests;
CREATE POLICY "part_requests_insert_policy" ON part_requests
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "part_requests_update_policy" ON part_requests;
CREATE POLICY "part_requests_update_policy" ON part_requests
    FOR UPDATE TO authenticated USING (true);

-- Políticas para bad_warehouse_inventory
DROP POLICY IF EXISTS "bad_warehouse_select_policy" ON bad_warehouse_inventory;
CREATE POLICY "bad_warehouse_select_policy" ON bad_warehouse_inventory
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "bad_warehouse_insert_policy" ON bad_warehouse_inventory;
CREATE POLICY "bad_warehouse_insert_policy" ON bad_warehouse_inventory
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bad_warehouse_update_policy" ON bad_warehouse_inventory;
CREATE POLICY "bad_warehouse_update_policy" ON bad_warehouse_inventory
    FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- PARTE 8: TRIGGER PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para work_orders
DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 9: COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE work_orders IS 'Órdenes de trabajo de taller/reparación';
COMMENT ON COLUMN work_orders.warranty_status IS 'Estado de garantía: in_warranty, out_of_warranty, pending_validation';
COMMENT ON COLUMN work_orders.quote_status IS 'Estado de cotización para casos fuera de garantía';
COMMENT ON COLUMN work_orders.seedstock_exchange IS 'Indica si hubo cambio de unidad (seedstock)';
COMMENT ON COLUMN work_orders.mmi_test_in IS 'Resultados JSON de pruebas MMI de entrada';
COMMENT ON COLUMN work_orders.mmi_test_out IS 'Resultados JSON de pruebas MMI de salida';

COMMENT ON TABLE part_requests IS 'Solicitudes de piezas para órdenes de trabajo';
COMMENT ON COLUMN part_requests.returned_part_sku IS 'SKU de la pieza defectuosa retornada';
COMMENT ON COLUMN part_requests.returned_part_status IS 'Estado del retorno de pieza a bodega mala';

COMMENT ON TABLE bad_warehouse_inventory IS 'Inventario de bodega mala (piezas defectuosas/dañadas)';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Resumen de cambios:
-- ✅ ENUMs creados: warranty_status_type, quote_status_type, returned_part_status_type
-- ✅ ENUM work_order_status actualizado con nuevos estados
-- ✅ Tabla work_orders: +20 columnas nuevas
-- ✅ Tabla part_requests: +6 columnas para retornos
-- ✅ Tabla bad_warehouse_inventory: Creada con campos completos
-- ✅ Índices optimizados
-- ✅ RLS y políticas configuradas
-- ✅ Trigger updated_at configurado

