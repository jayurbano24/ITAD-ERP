-- ============================================================
-- PASO 1: EJECUTA ESTO PRIMERO Y ESPERA A QUE SE COMPLETE
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'document_category'::regtype 
        AND enumlabel = 'logistica'
    ) THEN
        ALTER TYPE document_category ADD VALUE 'logistica';
    END IF;
END
$$;

-- Espera 5-10 segundos a que PostgreSQL procese completamente
-- Luego ejecuta PASO 2 en una NUEVA PESTAÑA O VENTANA DE SQL
