-- =========================================================================
-- Migración: Código corto para cajas de recepción
-- =========================================================================

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS box_reception_code CHAR(4);

COMMENT ON COLUMN ticket_items.box_reception_code IS 'Código corto de 4 dígitos asignado a cada caja cuando se guarda la recepción.';
