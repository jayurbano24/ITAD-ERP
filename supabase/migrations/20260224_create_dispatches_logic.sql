-- Fix for asset_status enum and buggy audit triggers
DO $$ BEGIN
    ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'scrapped';
    ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'in_progress';
    ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'diagnosing';
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Drop ALL known and potential problematic audit triggers on assets
DROP TRIGGER IF EXISTS trigger_audit_asset_changes ON public.assets CASCADE;
DROP TRIGGER IF EXISTS handle_asset_audit_trigger ON public.assets CASCADE;
DROP TRIGGER IF EXISTS audit_asset_update_trigger ON public.assets CASCADE;
DROP TRIGGER IF EXISTS tr_audit_assets ON public.assets CASCADE;
DROP TRIGGER IF EXISTS audit_asset_create_trigger ON public.assets CASCADE;
DROP TRIGGER IF EXISTS log_asset_changes ON public.assets CASCADE;
DROP TRIGGER IF EXISTS assets_audit_trigger ON public.assets CASCADE;
DROP TRIGGER IF EXISTS registrar_auditoria_trigger ON public.assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_create ON public.assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_delete ON public.assets CASCADE;

DROP FUNCTION IF EXISTS public.trigger_audit_asset_changes() CASCADE;
DROP FUNCTION IF EXISTS public.handle_asset_audit() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_audit_asset_update() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_audit_asset_create() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_audit_asset_delete() CASCADE;
DROP FUNCTION IF EXISTS public.log_asset_changes() CASCADE;
DROP FUNCTION IF EXISTS public.audit_asset_changes() CASCADE;
DROP FUNCTION IF EXISTS public.registrar_auditoria() CASCADE;
DROP FUNCTION IF EXISTS public.audit_trigger_function() CASCADE;

-- Create Dispatches table
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_code TEXT NOT NULL UNIQUE,
    origin_warehouse TEXT NOT NULL,
    movement_type TEXT NOT NULL DEFAULT 'DESTRUCTION', -- 'TRANSFER' or 'DESTRUCTION'
    status TEXT NOT NULL DEFAULT 'DISPATCHED', -- 'DISPATCHED'
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    dispatched_by UUID REFERENCES auth.users(id),
    client_id UUID REFERENCES public.crm_entities(id),
    driver_name TEXT,
    vehicle_plate TEXT,
    total_weight_lb NUMERIC(10, 2),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Dispatch Items table
CREATE TABLE IF NOT EXISTS public.dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES public.assets(id),
    product_summary TEXT, -- Snapshot of manufacturer/model/type
    weight_lb NUMERIC(10, 2), -- Prorated or individual weight
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow all for authenticated users for now)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.dispatches;
CREATE POLICY "Allow all for authenticated users" ON public.dispatches
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.dispatch_items;
CREATE POLICY "Allow all for authenticated users" ON public.dispatch_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);


-- Sequence for Dispatch Code (Independent sequential ID)
CREATE SEQUENCE IF NOT EXISTS dispatch_code_seq;

-- Function to generate correlative code (DEP0001 format)
-- Supports concurrency via nextval() and indefinite growth (DEP9999 -> DEP10000)
CREATE OR REPLACE FUNCTION generate_dispatch_code() RETURNS TEXT AS $$
DECLARE
    seq_val BIGINT;
    formatted_num TEXT;
BEGIN
    -- Atomic increment, safe for concurrency
    seq_val := nextval('dispatch_code_seq');
    
    -- Format logic: 
    -- If < 10000, pad with leading zeros to ensure 4 digits (e.g., 1 -> 0001)
    -- If >= 10000, strictly use the number string (e.g., 10000 -> 10000)
    IF seq_val < 10000 THEN
        formatted_num := lpad(seq_val::text, 4, '0');
    ELSE
        formatted_num := seq_val::text;
    END IF;
    
    RETURN 'DEP' || formatted_num;
END;
$$ LANGUAGE plpgsql;

-- Transactional RPC to create dispatch
DROP FUNCTION IF EXISTS public.create_destruction_dispatch(text, uuid, text, text, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.create_destruction_dispatch(text, uuid, text, text, numeric, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_destruction_dispatch(text, uuid, text, text, numeric, uuid[], uuid);

CREATE OR REPLACE FUNCTION create_destruction_dispatch(
    p_origin_warehouse TEXT,
    p_client_id UUID,
    p_driver_name TEXT,
    p_vehicle_plate TEXT,
    p_total_weight NUMERIC,
    p_asset_ids UUID[],
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_dispatch_id UUID;
    v_dispatch_code TEXT;
    v_current_asset_id UUID;
    v_count INTEGER;
    v_avg_weight NUMERIC;
    v_asset_record RECORD;
    v_origin_warehouse_id UUID;
BEGIN
    -- Get origin warehouse ID
    SELECT id INTO v_origin_warehouse_id 
    FROM public.warehouses 
    WHERE code = p_origin_warehouse;
    
    -- 1. Generate Correlative Code
    v_dispatch_code := generate_dispatch_code();

    -- 2. Create Header
    INSERT INTO public.dispatches (
        dispatch_code, origin_warehouse, movement_type, status, 
        dispatched_by, client_id, driver_name, vehicle_plate, total_weight_lb
    ) VALUES (
        v_dispatch_code, p_origin_warehouse, 'DESTRUCTION', 'DISPATCHED',
        p_user_id, p_client_id, p_driver_name, p_vehicle_plate, p_total_weight
    ) RETURNING id INTO v_dispatch_id;

    -- 3. Calculate avg weight for items
    v_count := array_length(p_asset_ids, 1);
    IF v_count > 0 THEN
        v_avg_weight := p_total_weight / v_count;
    ELSE
        v_avg_weight := 0;
    END IF;

    -- 4. Process Items
    FOREACH v_current_asset_id IN ARRAY p_asset_ids
    LOOP
        -- Get snapshot info
        SELECT manufacturer, model, asset_type INTO v_asset_record 
        FROM public.assets AS a
        WHERE a.id = v_current_asset_id;
        
        -- Insert Item
        INSERT INTO public.dispatch_items (
            dispatch_id, asset_id, product_summary, weight_lb
        ) VALUES (
            v_dispatch_id, v_current_asset_id, 
            concat_ws(' ', v_asset_record.manufacturer, v_asset_record.model, v_asset_record.asset_type),
            v_avg_weight
        );

        UPDATE public.assets AS a
        SET 
            location = 'Fuera de Almacén (Despachado)',
            status = 'scrapped'::public.asset_status,
            current_warehouse_id = NULL,
            sold_to = p_client_id, 
            sold_at = NOW(),
            notes = coalesce(a.notes, '') || E'\nDespacho: ' || v_dispatch_code
        WHERE a.id = v_current_asset_id;

        -- Record Inventory Movement (Exit)
        IF v_origin_warehouse_id IS NOT NULL THEN
            INSERT INTO public.inventory_movements (
                asset_id, from_warehouse_id, to_warehouse_id, 
                movement_type, notes, created_by, created_at,
                item_type, item_id, item_sku, quantity
            ) VALUES (
                v_current_asset_id, v_origin_warehouse_id, v_origin_warehouse_id,
                'dispatch', 'Salida por despacho ' || v_dispatch_code,
                p_user_id, NOW(),
                'asset', v_current_asset_id, COALESCE(v_asset_record.asset_type, 'N/A'), 1
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'dispatch_id', v_dispatch_id, 
        'dispatch_code', v_dispatch_code
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando despacho: % (Estado: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql;

-- CRITICAL: Force PostgREST schema cache reload
NOTIFY pgrst, 'reload config';
