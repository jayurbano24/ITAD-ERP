-- =====================================================
-- ITAD ERP Guatemala - Esquema de Inventario y Despacho
-- Versión: 007
-- Fecha: 2025-12-03
-- Descripción: Catálogo de piezas, inventario seedstock
--              y funciones transaccionales de despacho
-- =====================================================

-- =====================================================
-- PARTE 1: CATÁLOGO DE PIEZAS (Stock Bueno)
-- =====================================================

CREATE TABLE IF NOT EXISTS parts_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Categorización
    category TEXT CHECK (category IN (
        'screen', 'battery', 'keyboard', 'trackpad', 'speaker',
        'camera', 'motherboard', 'ram', 'storage', 'charger',
        'cable', 'connector', 'fan', 'hinge', 'case', 'other'
    )),
    
    -- Compatibilidad
    compatible_brands TEXT[], -- Array: ['Apple', 'Samsung', 'Dell']
    compatible_models TEXT[], -- Array: ['iPhone 12', 'Galaxy S21']
    
    -- Inventario
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    location TEXT, -- Ubicación en bodega (Ej: "A-12-3")
    
    -- Costos
    unit_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 2: INVENTARIO SEEDSTOCK (Unidades de Reemplazo)
-- =====================================================

CREATE TABLE IF NOT EXISTS seedstock_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    imei TEXT UNIQUE,
    serial_number TEXT,
    
    -- Producto
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT,
    storage_capacity TEXT, -- Ej: "128GB"
    
    -- Estado
    status TEXT DEFAULT 'available' CHECK (status IN (
        'available',    -- Disponible para despacho
        'reserved',     -- Reservado para una orden
        'dispatched',   -- Despachado/Entregado
        'defective'     -- Defectuoso
    )),
    
    -- Condición
    condition TEXT DEFAULT 'new' CHECK (condition IN (
        'new',          -- Nuevo
        'refurbished',  -- Reacondicionado
        'open_box'      -- Caja abierta
    )),
    
    -- Trazabilidad
    work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    dispatched_at TIMESTAMPTZ,
    dispatched_by UUID REFERENCES profiles(id),
    
    -- Ubicación
    warehouse_location TEXT,
    
    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 3: MOVIMIENTOS DE INVENTARIO (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    
    -- Tipo de movimiento
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'receipt',      -- Ingreso
        'dispatch',     -- Despacho
        'return',       -- Devolución
        'adjustment',   -- Ajuste manual
        'transfer',     -- Transferencia entre bodegas
        'scrap'         -- Baja/Desecho
    )),
    
    -- Referencia al item
    item_type TEXT NOT NULL CHECK (item_type IN ('part', 'seedstock', 'asset')),
    item_id UUID NOT NULL,
    item_sku TEXT,
    
    -- Cantidad
    quantity INTEGER NOT NULL,
    
    -- Trazabilidad
    work_order_id UUID REFERENCES work_orders(id),
    reference_number TEXT, -- Número de guía, factura, etc.
    
    -- Usuario
    performed_by UUID REFERENCES profiles(id),
    
    -- Notas
    notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PARTE 4: ÍNDICES
-- =====================================================

-- parts_catalog
CREATE INDEX IF NOT EXISTS idx_parts_catalog_sku ON parts_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_parts_catalog_category ON parts_catalog(category);
CREATE INDEX IF NOT EXISTS idx_parts_catalog_stock ON parts_catalog(stock_quantity);

-- seedstock_inventory
CREATE INDEX IF NOT EXISTS idx_seedstock_imei ON seedstock_inventory(imei);
CREATE INDEX IF NOT EXISTS idx_seedstock_status ON seedstock_inventory(status);
CREATE INDEX IF NOT EXISTS idx_seedstock_brand_model ON seedstock_inventory(brand, model);
CREATE INDEX IF NOT EXISTS idx_seedstock_work_order ON seedstock_inventory(work_order_id);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_item ON inventory_movements(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_movements_work_order ON inventory_movements(work_order_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(created_at DESC);

-- =====================================================
-- PARTE 5: RLS (Row Level Security)
-- =====================================================

ALTER TABLE parts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE seedstock_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para parts_catalog
DROP POLICY IF EXISTS "parts_catalog_select" ON parts_catalog;
CREATE POLICY "parts_catalog_select" ON parts_catalog
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "parts_catalog_insert" ON parts_catalog;
CREATE POLICY "parts_catalog_insert" ON parts_catalog
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parts_catalog_update" ON parts_catalog;
CREATE POLICY "parts_catalog_update" ON parts_catalog
    FOR UPDATE TO authenticated USING (true);

-- Políticas para seedstock_inventory
DROP POLICY IF EXISTS "seedstock_select" ON seedstock_inventory;
CREATE POLICY "seedstock_select" ON seedstock_inventory
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "seedstock_insert" ON seedstock_inventory;
CREATE POLICY "seedstock_insert" ON seedstock_inventory
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "seedstock_update" ON seedstock_inventory;
CREATE POLICY "seedstock_update" ON seedstock_inventory
    FOR UPDATE TO authenticated USING (true);

-- Políticas para inventory_movements
DROP POLICY IF EXISTS "movements_select" ON inventory_movements;
CREATE POLICY "movements_select" ON inventory_movements
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "movements_insert" ON inventory_movements;
CREATE POLICY "movements_insert" ON inventory_movements
    FOR INSERT TO authenticated WITH CHECK (true);

-- =====================================================
-- PARTE 6: TRIGGERS
-- =====================================================

-- Trigger para updated_at en parts_catalog
DROP TRIGGER IF EXISTS update_parts_catalog_updated_at ON parts_catalog;
CREATE TRIGGER update_parts_catalog_updated_at
    BEFORE UPDATE ON parts_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at en seedstock_inventory
DROP TRIGGER IF EXISTS update_seedstock_updated_at ON seedstock_inventory;
CREATE TRIGGER update_seedstock_updated_at
    BEFORE UPDATE ON seedstock_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 7: FUNCIÓN TRANSACCIONAL - DESPACHAR PIEZA
-- =====================================================

CREATE OR REPLACE FUNCTION dispatch_part(
    p_work_order_id UUID,
    p_part_request_id UUID,
    p_part_sku TEXT,
    p_returned_sku TEXT,
    p_returned_serial TEXT,
    p_returned_condition TEXT,
    p_performed_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_part_id UUID;
    v_current_stock INTEGER;
    v_bad_inventory_id UUID;
BEGIN
    -- 1. Verificar que existe el SKU y tiene stock
    SELECT id, stock_quantity INTO v_part_id, v_current_stock
    FROM parts_catalog
    WHERE sku = p_part_sku AND is_active = TRUE
    FOR UPDATE; -- Lock para evitar race conditions

    IF v_part_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'SKU no encontrado');
    END IF;

    IF v_current_stock < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sin stock disponible');
    END IF;

    -- 2. Restar stock de piezas buenas
    UPDATE parts_catalog
    SET stock_quantity = stock_quantity - 1,
        updated_at = NOW()
    WHERE id = v_part_id;

    -- 3. Agregar a bodega mala (pieza dañada retornada)
    INSERT INTO bad_warehouse_inventory (
        sku,
        part_name,
        quantity,
        condition,
        work_order_id,
        part_request_id,
        original_serial,
        received_from,
        received_by,
        notes
    ) VALUES (
        p_returned_sku,
        (SELECT name FROM parts_catalog WHERE sku = p_returned_sku LIMIT 1),
        1,
        COALESCE(p_returned_condition, 'defective'),
        p_work_order_id,
        p_part_request_id,
        p_returned_serial,
        'Workshop Exchange',
        p_performed_by,
        'Intercambio de pieza en reparación'
    )
    RETURNING id INTO v_bad_inventory_id;

    -- 4. Actualizar part_request
    UPDATE part_requests
    SET status = 'installed',
        installed_at = NOW(),
        returned_part_sku = p_returned_sku,
        returned_part_serial = p_returned_serial,
        returned_part_status = 'returned',
        returned_part_condition = p_returned_condition,
        returned_at = NOW()
    WHERE id = p_part_request_id;

    -- 5. Registrar movimiento de salida
    INSERT INTO inventory_movements (
        movement_type, item_type, item_id, item_sku, quantity,
        work_order_id, performed_by, notes
    ) VALUES (
        'dispatch', 'part', v_part_id, p_part_sku, -1,
        p_work_order_id, p_performed_by, 'Despacho a taller'
    );

    -- 6. Registrar movimiento de entrada (bodega mala)
    INSERT INTO inventory_movements (
        movement_type, item_type, item_id, item_sku, quantity,
        work_order_id, performed_by, notes
    ) VALUES (
        'return', 'part', v_bad_inventory_id, p_returned_sku, 1,
        p_work_order_id, p_performed_by, 'Ingreso a bodega mala por intercambio'
    );

    -- 7. Actualizar estado de la orden
    UPDATE work_orders
    SET status = 'in_progress',
        updated_at = NOW()
    WHERE id = p_work_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'dispatched_part_id', v_part_id,
        'bad_inventory_id', v_bad_inventory_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 8: FUNCIÓN TRANSACCIONAL - DESPACHAR SEEDSTOCK
-- =====================================================

CREATE OR REPLACE FUNCTION dispatch_seedstock(
    p_work_order_id UUID,
    p_seedstock_id UUID,
    p_new_imei TEXT,
    p_performed_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_original_imei TEXT;
    v_original_serial TEXT;
    v_seedstock_record RECORD;
BEGIN
    -- 1. Verificar que el seedstock existe y está disponible
    SELECT * INTO v_seedstock_record
    FROM seedstock_inventory
    WHERE id = p_seedstock_id AND status = 'available'
    FOR UPDATE;

    IF v_seedstock_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Seedstock no disponible');
    END IF;

    -- 2. Obtener datos originales de la orden
    SELECT original_imei, original_serial 
    INTO v_original_imei, v_original_serial
    FROM work_orders
    WHERE id = p_work_order_id;

    -- 3. Actualizar seedstock como despachado
    UPDATE seedstock_inventory
    SET status = 'dispatched',
        work_order_id = p_work_order_id,
        dispatched_at = NOW(),
        dispatched_by = p_performed_by,
        updated_at = NOW()
    WHERE id = p_seedstock_id;

    -- 4. Actualizar la orden de trabajo
    UPDATE work_orders
    SET seedstock_exchange = TRUE,
        original_imei = COALESCE(v_original_imei, original_imei),
        new_imei = p_new_imei,
        new_serial = v_seedstock_record.serial_number,
        seedstock_date = NOW(),
        status = 'in_progress',
        updated_at = NOW()
    WHERE id = p_work_order_id;

    -- 5. Registrar movimiento
    INSERT INTO inventory_movements (
        movement_type, item_type, item_id, item_sku, quantity,
        work_order_id, performed_by, notes
    ) VALUES (
        'dispatch', 'seedstock', p_seedstock_id, v_seedstock_record.imei, -1,
        p_work_order_id, p_performed_by, 
        FORMAT('Seedstock despachado. Original IMEI: %s -> Nuevo IMEI: %s', 
               COALESCE(v_original_imei, 'N/A'), p_new_imei)
    );

    RETURN jsonb_build_object(
        'success', true,
        'seedstock_id', p_seedstock_id,
        'original_imei', v_original_imei,
        'new_imei', p_new_imei
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 9: DATOS DE PRUEBA (Opcional)
-- =====================================================

-- Insertar algunas piezas de ejemplo
INSERT INTO parts_catalog (sku, name, category, stock_quantity, unit_cost, location) VALUES
('SCR-IPH12-BLK', 'Pantalla iPhone 12 Negro', 'screen', 15, 85.00, 'A-01-01'),
('SCR-IPH13-BLK', 'Pantalla iPhone 13 Negro', 'screen', 10, 120.00, 'A-01-02'),
('BAT-IPH12', 'Batería iPhone 12', 'battery', 25, 35.00, 'B-02-01'),
('BAT-IPH13', 'Batería iPhone 13', 'battery', 20, 45.00, 'B-02-02'),
('KBD-MBP-2020', 'Teclado MacBook Pro 2020', 'keyboard', 8, 150.00, 'C-03-01'),
('SCR-S21-BLK', 'Pantalla Samsung S21 Negro', 'screen', 12, 95.00, 'A-02-01'),
('BAT-S21', 'Batería Samsung S21', 'battery', 18, 40.00, 'B-03-01')
ON CONFLICT (sku) DO NOTHING;

-- Insertar seedstock de ejemplo
INSERT INTO seedstock_inventory (imei, serial_number, brand, model, color, storage_capacity, condition, warehouse_location) VALUES
('350000000000001', 'SEED-001', 'Apple', 'iPhone 12', 'Negro', '128GB', 'refurbished', 'SEED-A-01'),
('350000000000002', 'SEED-002', 'Apple', 'iPhone 12', 'Blanco', '128GB', 'refurbished', 'SEED-A-02'),
('350000000000003', 'SEED-003', 'Apple', 'iPhone 13', 'Negro', '256GB', 'new', 'SEED-A-03'),
('350000000000004', 'SEED-004', 'Samsung', 'Galaxy S21', 'Negro', '128GB', 'refurbished', 'SEED-B-01'),
('350000000000005', 'SEED-005', 'Samsung', 'Galaxy S22', 'Blanco', '256GB', 'new', 'SEED-B-02')
ON CONFLICT (imei) DO NOTHING;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Resumen:
-- ✅ Tabla parts_catalog (Stock bueno)
-- ✅ Tabla seedstock_inventory (Unidades de reemplazo)
-- ✅ Tabla inventory_movements (Audit trail)
-- ✅ Función dispatch_part() - Transaccional con intercambio
-- ✅ Función dispatch_seedstock() - Transaccional con trazabilidad
-- ✅ Índices optimizados
-- ✅ RLS configurado
-- ✅ Datos de prueba

