-- =========================================================================
-- Migración: Asegurar que todas las restricciones únicas necesarias existan
-- =========================================================================
-- Esta migración asegura que todas las tablas que usan ON CONFLICT
-- tengan las restricciones únicas necesarias.

-- 1. Asegurar constraint único en warehouses.code
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'warehouses'
        AND c.contype = 'u'
        AND EXISTS (
            SELECT 1
            FROM pg_attribute a
            JOIN pg_constraint cc ON a.attrelid = cc.conrelid
            WHERE cc.oid = c.oid
            AND a.attname = 'code'
            AND a.attnum = ANY(cc.conkey)
        )
    ) THEN
        ALTER TABLE public.warehouses 
        ADD CONSTRAINT warehouses_code_unique UNIQUE (code);
        RAISE NOTICE 'Created unique constraint on warehouses.code';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint on warehouses.code already exists';
    WHEN others THEN
        RAISE WARNING 'Could not create unique constraint on warehouses.code: %', SQLERRM;
END $$;

-- 2. Asegurar constraint único en ticket_reception_log(ticket_id, box_number)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND t.relname = 'ticket_reception_log'
        AND c.contype = 'u'
        AND array_length(c.conkey, 1) = 2
        AND EXISTS (
            SELECT 1
            FROM pg_attribute a1
            JOIN pg_attribute a2 ON a1.attrelid = a2.attrelid
            WHERE a1.attrelid = c.conrelid
            AND a1.attname = 'ticket_id'
            AND a1.attnum = ANY(c.conkey)
            AND a2.attname = 'box_number'
            AND a2.attnum = ANY(c.conkey)
        )
    ) THEN
        ALTER TABLE public.ticket_reception_log 
        ADD CONSTRAINT ticket_reception_log_ticket_box_unique UNIQUE (ticket_id, box_number);
        RAISE NOTICE 'Created unique constraint on ticket_reception_log(ticket_id, box_number)';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint on ticket_reception_log(ticket_id, box_number) already exists';
    WHEN undefined_table THEN
        RAISE NOTICE 'Table ticket_reception_log does not exist yet, skipping';
    WHEN others THEN
        RAISE WARNING 'Could not create unique constraint on ticket_reception_log: %', SQLERRM;
END $$;

-- 3. Verificar y reportar el estado de las restricciones
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    -- Contar constraints únicos en warehouses.code
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.relname = 'warehouses'
    AND c.contype = 'u'
    AND EXISTS (
        SELECT 1
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
        AND a.attname = 'code'
        AND a.attnum = ANY(c.conkey)
    );
    
    IF constraint_count = 0 THEN
        RAISE WARNING 'No unique constraint found on warehouses.code - ON CONFLICT will fail!';
    ELSE
        RAISE NOTICE 'Unique constraint on warehouses.code: OK';
    END IF;
END $$;
