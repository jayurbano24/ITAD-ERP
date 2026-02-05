-- Migration: Agregar campo de fecha de traslado a inventory_movements y assets

-- Agregar columna transfer_date a inventory_movements
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS transfer_date TIMESTAMPTZ;

-- Si transfer_date es NULL, usar created_at como valor por defecto
UPDATE inventory_movements
SET transfer_date = created_at
WHERE transfer_date IS NULL;

-- Establecer created_at como default para transfer_date en futuros registros
ALTER TABLE inventory_movements
    ALTER COLUMN transfer_date SET DEFAULT NOW();

-- Agregar columna last_transfer_date a assets para facilitar consultas
ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS last_transfer_date TIMESTAMPTZ;

-- Crear índice para mejorar consultas por fecha de traslado
CREATE INDEX IF NOT EXISTS idx_inventory_movements_transfer_date 
    ON inventory_movements(transfer_date DESC);

CREATE INDEX IF NOT EXISTS idx_assets_last_transfer_date 
    ON assets(last_transfer_date DESC);

COMMENT ON COLUMN inventory_movements.transfer_date IS 
    'Fecha y hora específica del traslado del activo';
COMMENT ON COLUMN assets.last_transfer_date IS 
    'Fecha del último traslado del activo a su bodega actual';
