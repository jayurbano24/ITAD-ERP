-- Add reference_number column to inventory_movements for correlative tracking
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS reference_number TEXT;

COMMENT ON COLUMN inventory_movements.reference_number IS 
    'Número de referencia o correlativo del traslado';

CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference_number
    ON inventory_movements(reference_number);
