-- Hotfix: Agregar valores faltantes al enum ticket_status
-- Esto soluciona errores de "invalid input value for enum ticket_status"
-- causado por estados definidos en el código pero no en la base de datos.
-- Incluye versiones en inglés y español.

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'open' AFTER 'draft';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'pending' AFTER 'open';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'assigned' AFTER 'pending';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'closed' AFTER 'completed';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Nuevos estados detectados en reportes de usuario
DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'En proceso';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Recibido Parcial';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Completado';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Versiones en español anteriores
DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Abierto';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Pendiente';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Asignado';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'Cerrado';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
