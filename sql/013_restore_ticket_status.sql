-- ============================================================================
-- Migración: Guardar el estado previo del ticket en batches
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

ALTER TABLE batches
ADD COLUMN IF NOT EXISTS ticket_previous_status ticket_status;

COMMENT ON COLUMN batches.ticket_previous_status IS 'Estado del ticket antes de que se recibiera el lote';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
