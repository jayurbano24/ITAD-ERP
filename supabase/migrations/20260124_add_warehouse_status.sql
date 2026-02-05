-- Migration: Agregar campo de estatus a warehouses

-- Agregar columna status a warehouses
ALTER TABLE warehouses
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'activa';

-- Establecer valores por defecto para bodegas existentes
UPDATE warehouses
SET status = 'activa'
WHERE status IS NULL OR status = '';

-- Crear índice para mejorar consultas por estatus
CREATE INDEX IF NOT EXISTS idx_warehouses_status 
    ON warehouses(status);

-- Agregar constraint para validar valores de estatus
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'warehouses_status_check'
    ) THEN
        ALTER TABLE warehouses
            ADD CONSTRAINT warehouses_status_check
            CHECK (status IN ('activa', 'inactiva', 'mantenimiento', 'cerrada'));
    END IF;
END $$;

COMMENT ON COLUMN warehouses.status IS 
    'Estatus de la bodega: activa, inactiva, mantenimiento, cerrada';
