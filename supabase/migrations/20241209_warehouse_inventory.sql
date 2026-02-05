-- Tabla de Bodegas/Almacenes
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar bodegas por defecto
INSERT INTO warehouses (code, name, description) VALUES
('BOD-001', 'Bodega Principal', 'Bodega principal de almacenamiento'),
('BOD-002', 'Bodega Secundaria', 'Bodega secundaria'),
('BOD-DIAG', 'Área de Diagnóstico', 'Área para equipos en diagnóstico'),
('BOD-REP', 'Área de Reparación', 'Área para equipos en reparación'),
('BOD-VENTA', 'Bodega de Ventas', 'Equipos listos para venta'),
('BOD-REM', 'Bodega Remarketing', 'Equipos listos para remarketing')
ON CONFLICT (code) DO NOTHING;

-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    movement_type TEXT NOT NULL,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurarse de que la columna batch_id exista, ya que pudo ser agregada después de la creación inicial de la tabla.
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS batch_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_batch_id_fkey') THEN
        ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Asegurarse de que las columnas de bodega existan (corrección para tablas existentes)
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS from_warehouse_id UUID REFERENCES warehouses(id);
ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS to_warehouse_id UUID REFERENCES warehouses(id);

-- Agregar columna de bodega actual a assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS current_warehouse_id UUID REFERENCES warehouses(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_inventory_movements_asset ON inventory_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch ON inventory_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_assets_warehouse ON assets(current_warehouse_id);

-- Función genérica para actualizar timestamp (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en warehouses
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
