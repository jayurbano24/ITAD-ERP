-- ============================================================================
-- Migración: Agregar campos de transporte a batches
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Agregar campos de información de transporte
ALTER TABLE batches 
ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS driver_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(20),
ADD COLUMN IF NOT EXISTS transport_guide VARCHAR(50),
ADD COLUMN IF NOT EXISTS box_count INTEGER DEFAULT 0;

-- Crear índice para búsquedas por guía de transporte
CREATE INDEX IF NOT EXISTS idx_batches_transport_guide ON batches(transport_guide);

-- Comentarios descriptivos
COMMENT ON COLUMN batches.driver_name IS 'Nombre del chofer que entregó la mercadería';
COMMENT ON COLUMN batches.driver_id IS 'DPI o identificación del chofer';
COMMENT ON COLUMN batches.vehicle_plate IS 'Placa del vehículo de transporte';
COMMENT ON COLUMN batches.transport_guide IS 'Número de guía de transporte';
COMMENT ON COLUMN batches.box_count IS 'Cantidad de cajas/bultos recibidos';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

