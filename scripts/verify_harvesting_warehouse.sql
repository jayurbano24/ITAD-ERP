-- Ensure unique constraint exists on warehouses.code
DO $$
BEGIN
    -- Check if any unique constraint exists on the code column
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
        -- Create unique constraint if it doesn't exist
        ALTER TABLE public.warehouses 
        ADD CONSTRAINT warehouses_code_unique UNIQUE (code);
        RAISE NOTICE 'Created unique constraint on warehouses.code';
    ELSE
        RAISE NOTICE 'Unique constraint on warehouses.code already exists';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint already exists with different name, ignore
        RAISE NOTICE 'Unique constraint already exists (different name)';
    WHEN others THEN
        -- If constraint creation fails, log and continue
        RAISE NOTICE 'Could not create unique constraint: %', SQLERRM;
END $$;

-- Verify and insert Harvesting warehouse if it doesn't exist
INSERT INTO public.warehouses (code, name, description)
VALUES ('BOD-HARV', 'Bodega Harvesting', 'Equipos a despiezar')
ON CONFLICT (code) DO UPDATE 
SET name = 'Bodega Harvesting',
    description = 'Equipos a despiezar'
RETURNING *;

-- Check all warehouses
SELECT id, code, name, description FROM public.warehouses;
