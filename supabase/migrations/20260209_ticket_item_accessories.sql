-- Tabla para vincular accesorios a cada ticket_item (serie/equipo)
CREATE TABLE IF NOT EXISTS ticket_item_accessories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_item_id UUID NOT NULL REFERENCES ticket_items(id) ON DELETE CASCADE,
    accessory_id UUID NOT NULL REFERENCES catalog_accessories(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ticket_item_id, accessory_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_item_accessories_item ON ticket_item_accessories(ticket_item_id);
CREATE INDEX IF NOT EXISTS idx_ticket_item_accessories_accessory ON ticket_item_accessories(accessory_id);

COMMENT ON TABLE ticket_item_accessories IS 'Accesorios vinculados a cada equipo/serie en recepción';
COMMENT ON COLUMN ticket_item_accessories.ticket_item_id IS 'ID del ticket_item (equipo/serie) al que pertenece el accesorio';
COMMENT ON COLUMN ticket_item_accessories.accessory_id IS 'ID del accesorio del catálogo';
COMMENT ON COLUMN ticket_item_accessories.quantity IS 'Cantidad de este accesorio';
COMMENT ON COLUMN ticket_item_accessories.notes IS 'Observaciones sobre el accesorio (ej: estado, condición)';
