-- Migración para agregar nuevos valores al enum ticket_type
-- Valores a agregar: 'itad', 'mantenimiento', 'reparacion', 'instalacion', 'data_wipe', 'nist_800_88'

DO $$
BEGIN
    -- Agregar valor 'itad' si no existe
    BEGIN
        ALTER TYPE ticket_type ADD VALUE 'itad';
    EXCEPTION
        WHEN duplicate_object THEN RAISE NOTICE 'ticket_type "itad" already exists';
    END;

    -- Agregar valor 'mantenimiento' si no existe
    BEGIN
        ALTER TYPE ticket_type ADD VALUE 'mantenimiento';
    EXCEPTION
        WHEN duplicate_object THEN RAISE NOTICE 'ticket_type "mantenimiento" already exists';
    END;

    -- Agregar valor 'reparacion' si no existe
    BEGIN
        ALTER TYPE ticket_type ADD VALUE 'reparacion';
    EXCEPTION
        WHEN duplicate_object THEN RAISE NOTICE 'ticket_type "reparacion" already exists';
    END;

    -- Agregar valor 'instalacion' si no existe
    BEGIN
        ALTER TYPE ticket_type ADD VALUE 'instalacion';
    EXCEPTION
        WHEN duplicate_object THEN RAISE NOTICE 'ticket_type "instalacion" already exists';
    END;

    -- Agregar valor 'data_wipe' si no existe
    BEGIN
        ALTER TYPE ticket_type ADD VALUE 'data_wipe';
    EXCEPTION
        WHEN duplicate_object THEN RAISE NOTICE 'ticket_type "data_wipe" already exists';
    END;
END $$;
