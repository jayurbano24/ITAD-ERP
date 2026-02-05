-- =====================================================
-- MIGRACIÓN: Trackear estado y paso activo de la recepción
-- =====================================================

ALTER TABLE IF EXISTS batches
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS ultimo_paso_completado INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_batches_estado ON batches(estado);
