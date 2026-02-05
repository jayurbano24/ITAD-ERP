-- ============================================================================
-- Migración: Registrar metadatos de caja en ticket_items
-- ============================================================================

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS box_number INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS box_sku TEXT NULL,
ADD COLUMN IF NOT EXISTS box_seal TEXT NULL;

COMMENT ON COLUMN ticket_items.box_number IS 'Número de caja asignado durante la logística';
COMMENT ON COLUMN ticket_items.box_sku IS 'Identificador SKU generado al guardar la caja';
COMMENT ON COLUMN ticket_items.box_seal IS 'Número de precinto o sello aplicado a la caja';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
