-- Alternative version that doesn't require ON CONFLICT
-- Use this if the unique constraint doesn't exist

-- Check if warehouse exists
DO $$
DECLARE
    warehouse_exists BOOLEAN;
    warehouse_id UUID;
BEGIN
    -- Check if warehouse exists
    SELECT EXISTS(SELECT 1 FROM public.warehouses WHERE code = 'BOD-HARV') INTO warehouse_exists;
    
    IF warehouse_exists THEN
        -- Update existing warehouse
        UPDATE public.warehouses
        SET name = 'Bodega Harvesting',
            description = 'Equipos a despiezar',
            is_active = true
        WHERE code = 'BOD-HARV';
        RAISE NOTICE 'Updated existing warehouse BOD-HARV';
    ELSE
        -- Insert new warehouse
        INSERT INTO public.warehouses (code, name, description, is_active)
        VALUES ('BOD-HARV', 'Bodega Harvesting', 'Equipos a despiezar', true);
        RAISE NOTICE 'Created new warehouse BOD-HARV';
    END IF;
END $$;

-- Check all warehouses
SELECT id, code, name, description, is_active 
FROM public.warehouses 
ORDER BY code;
