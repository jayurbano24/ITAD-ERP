-- Garantiza que el campo "color" exista en la tabla de equipos esperados
ALTER TABLE batch_expected_items
ADD COLUMN IF NOT EXISTS color TEXT;
