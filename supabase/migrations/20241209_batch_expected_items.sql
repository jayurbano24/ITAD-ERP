-- Tabla para equipos esperados del conduce (lo que dice el documento)
CREATE TABLE IF NOT EXISTS batch_expected_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    color TEXT,
    expected_quantity INTEGER NOT NULL DEFAULT 1,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_batch_expected_items_batch ON batch_expected_items(batch_id);

-- Agregar campo asset_type a la tabla assets si no existe
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_type TEXT;

