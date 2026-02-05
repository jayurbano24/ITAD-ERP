-- Migración: Agregar referencias a catálogos maestros en ticket_items
-- Permite vincular items de tickets directamente a marcas, modelos y tipos de producto del catálogo maestro

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES catalog_brands(id) ON DELETE SET NULL;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES catalog_models(id) ON DELETE SET NULL;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS product_type_id UUID REFERENCES catalog_product_types(id) ON DELETE SET NULL;

-- Campos para cantidad esperada y recibida (reemplaza el modelo de serial esperado/recolectado)
ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS expected_quantity INTEGER DEFAULT 1;

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0;

-- Estado del item del ticket
ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'PARCIAL', 'COMPLETADO', 'RECHAZADO'));

COMMENT ON COLUMN ticket_items.brand_id IS 'Referencia a la marca del catálogo maestro';
COMMENT ON COLUMN ticket_items.model_id IS 'Referencia al modelo del catálogo maestro';
COMMENT ON COLUMN ticket_items.product_type_id IS 'Referencia al tipo de producto del catálogo maestro';
COMMENT ON COLUMN ticket_items.expected_quantity IS 'Cantidad esperada del item a recolectar';
COMMENT ON COLUMN ticket_items.received_quantity IS 'Cantidad efectivamente recibida del item';
COMMENT ON COLUMN ticket_items.status IS 'Estado de recepción: PENDIENTE, PARCIAL, COMPLETADO o RECHAZADO';

-- Índices para mejorar queries
CREATE INDEX IF NOT EXISTS idx_ticket_items_brand_id ON ticket_items(brand_id);
CREATE INDEX IF NOT EXISTS idx_ticket_items_model_id ON ticket_items(model_id);
CREATE INDEX IF NOT EXISTS idx_ticket_items_product_type_id ON ticket_items(product_type_id);
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id ON ticket_items(ticket_id);
