-- =========================================================================
-- Migración: Campos adicionales en ticket_items para la clasificación y especificaciones
-- =========================================================================

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS brand_full TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS model_full TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS color_detail TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS classification_rec CHAR(1);

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS classification_f TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS classification_c TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS processor TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS bios_version TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS observations TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS ram_capacity TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS ram_type TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS disk_capacity TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS disk_type TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS keyboard_type TEXT;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS keyboard_version TEXT;

COMMENT ON COLUMN ticket_items.brand_full IS 'Marca completa capturada durante la clasificación en recepción';
COMMENT ON COLUMN ticket_items.model_full IS 'Modelo completo capturado durante la clasificación en recepción';
COMMENT ON COLUMN ticket_items.color_detail IS 'Detalle de color registrado durante la recepción';
COMMENT ON COLUMN ticket_items.classification_rec IS 'Clasificación REC asignada en taller';
COMMENT ON COLUMN ticket_items.classification_f IS 'Clasificación funcional (F) capturada en recepción';
COMMENT ON COLUMN ticket_items.classification_c IS 'Clasificación cosmética (C) capturada en recepción';
COMMENT ON COLUMN ticket_items.processor IS 'Procesador identificado durante la recepción';
COMMENT ON COLUMN ticket_items.bios_version IS 'Versión de BIOS registrada en recepción';
COMMENT ON COLUMN ticket_items.observations IS 'Observaciones registradas al clasificar el equipo';
COMMENT ON COLUMN ticket_items.ram_capacity IS 'Capacidad de memoria RAM';
COMMENT ON COLUMN ticket_items.ram_type IS 'Tipo de RAM';
COMMENT ON COLUMN ticket_items.disk_capacity IS 'Capacidad de disco';
COMMENT ON COLUMN ticket_items.disk_type IS 'Tipo de disco';
COMMENT ON COLUMN ticket_items.keyboard_type IS 'Distribución del teclado';
COMMENT ON COLUMN ticket_items.keyboard_version IS 'Versión del teclado (iluminado, mecánico, etc.)';

-- Rellenar con los valores básicos existentes para minimizar gaps
UPDATE ticket_items
SET
  brand_full = COALESCE(brand_full, brand),
  model_full = COALESCE(model_full, model),
  color_detail = COALESCE(color_detail, color);
