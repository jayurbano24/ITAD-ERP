-- ============================================================================
-- Migración: Registrar datos de recolección en operaciones_tickets
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

ALTER TABLE operations_tickets
ADD COLUMN IF NOT EXISTS collector_name TEXT NULL,
ADD COLUMN IF NOT EXISTS collector_phone TEXT NULL,
ADD COLUMN IF NOT EXISTS vehicle_model TEXT NULL,
ADD COLUMN IF NOT EXISTS vehicle_plate TEXT NULL,
ADD COLUMN IF NOT EXISTS ram_capacity TEXT NULL,
ADD COLUMN IF NOT EXISTS ram_type TEXT NULL,
ADD COLUMN IF NOT EXISTS disk_capacity TEXT NULL,
ADD COLUMN IF NOT EXISTS disk_type TEXT NULL,
ADD COLUMN IF NOT EXISTS keyboard_type TEXT NULL,
ADD COLUMN IF NOT EXISTS keyboard_version TEXT NULL;

COMMENT ON COLUMN operations_tickets.collector_name IS 'Nombre del personal capturado manualmente al finalizar logística';
COMMENT ON COLUMN operations_tickets.collector_phone IS 'Teléfono/contacto asociado al recolector';
COMMENT ON COLUMN operations_tickets.vehicle_model IS 'Marca o modelo del vehículo usado para la recolección';
COMMENT ON COLUMN operations_tickets.vehicle_plate IS 'Placa o identificador del vehículo usado';
COMMENT ON COLUMN operations_tickets.ram_capacity IS 'Capacidad total de memoria RAM registrada en la recepción';
COMMENT ON COLUMN operations_tickets.ram_type IS 'Tipo o estándar de memoria RAM instalado';
COMMENT ON COLUMN operations_tickets.disk_capacity IS 'Capacidad total del disco principal recibido';
COMMENT ON COLUMN operations_tickets.disk_type IS 'Tipo, interfaz o modelo del disco reportado';
COMMENT ON COLUMN operations_tickets.keyboard_type IS 'Tipo de teclado asociado al equipo (mecánico, membrana, etc.)';
COMMENT ON COLUMN operations_tickets.keyboard_version IS 'Versión o variante del teclado reportado';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
