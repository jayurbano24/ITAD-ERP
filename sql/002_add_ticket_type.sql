-- ============================================================================
-- Migración: Agregar campo ticket_type a operations_tickets
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- Crear el tipo ENUM para tipos de ticket
DO $$ BEGIN
    CREATE TYPE ticket_type AS ENUM (
        'recoleccion',  -- Recolección de equipos
        'garantia',     -- Servicio de garantía
        'auditoria',    -- Auditoría de activos
        'destruccion',  -- Destrucción certificada
        'reciclaje'     -- Reciclaje de materiales
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Agregar columna ticket_type a operations_tickets
ALTER TABLE operations_tickets 
ADD COLUMN IF NOT EXISTS ticket_type ticket_type NOT NULL DEFAULT 'recoleccion';

-- Crear índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_tickets_type ON operations_tickets(ticket_type);

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

