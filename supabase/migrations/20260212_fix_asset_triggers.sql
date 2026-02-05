-- =========================================================================
-- CORREGIR TRIGGERS DE ASSETS PARA USAR CAMPOS REALES
-- =========================================================================

-- Desactivar triggers temporalmente
DROP TRIGGER IF EXISTS audit_asset_create_trigger ON assets;
DROP TRIGGER IF EXISTS audit_asset_update_trigger ON assets;
DROP FUNCTION IF EXISTS trigger_audit_asset_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_update() CASCADE;

-- =========================================================================
-- NUEVA FUNCIÓN PARA CREATE EN ASSETS
-- =========================================================================
CREATE OR REPLACE FUNCTION trigger_audit_asset_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_ref TEXT;
    v_ticket_id UUID;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Obtener referencia del lote y ticket
    SELECT internal_batch_id, ticket_id 
    INTO v_batch_ref, v_ticket_id
    FROM batches
    WHERE id = NEW.batch_id;
    
    PERFORM log_audit_event(
        'CREATE'::audit_action_type,
        'RECEPTION'::audit_module_type,
        format('Activo creado: %s %s %s S/N: %s', 
            COALESCE(NEW.manufacturer, ''),
            COALESCE(NEW.model, ''),
            COALESCE(NEW.asset_type, ''),
            COALESCE(NEW.serial_number, 'SIN-SERIE')
        ),
        'ASSET'::audit_entity_type,
        NEW.id,
        NEW.serial_number,
        v_ticket_id,
        NEW.batch_id,
        NEW.id,
        NULL,
        to_jsonb(NEW),
        jsonb_build_object(
            'serial_number', NEW.serial_number,
            'manufacturer', NEW.manufacturer,
            'model', NEW.model,
            'asset_type', NEW.asset_type,
            'status', NEW.status
        ),
        v_user_id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_asset_create_trigger
AFTER INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_create();

-- =========================================================================
-- NUEVA FUNCIÓN PARA UPDATE EN ASSETS
-- =========================================================================
CREATE OR REPLACE FUNCTION trigger_audit_asset_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_description TEXT;
    v_ticket_id UUID;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    SELECT ticket_id INTO v_ticket_id FROM batches WHERE id = NEW.batch_id;
    
    -- Detectar cambios en status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_description := format('Activo %s: Estado %s → %s', NEW.serial_number, OLD.status, NEW.status);
    END IF;
    
    -- Detectar cambios en location
    IF OLD.location IS DISTINCT FROM NEW.location THEN
        v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Ubicación actualizada de %s a %s', NEW.serial_number, OLD.location, NEW.location);
        END IF;
    END IF;
    
    -- Detectar cambios en current_warehouse_id
    IF OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id THEN
        v_changes := v_changes || jsonb_build_object('current_warehouse_id', jsonb_build_object('old', OLD.current_warehouse_id, 'new', NEW.current_warehouse_id));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Bodega actualizada', NEW.serial_number);
        END IF;
    END IF;
    
    -- Detectar cambios en sales_price
    IF OLD.sales_price IS DISTINCT FROM NEW.sales_price THEN
        v_changes := v_changes || jsonb_build_object('sales_price', jsonb_build_object('old', OLD.sales_price, 'new', NEW.sales_price));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Precio actualizado', NEW.serial_number);
        END IF;
    END IF;

    -- Detectar cambios en data_wipe_status
    IF OLD.data_wipe_status IS DISTINCT FROM NEW.data_wipe_status THEN
        v_changes := v_changes || jsonb_build_object('data_wipe_status', jsonb_build_object('old', OLD.data_wipe_status, 'new', NEW.data_wipe_status));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Estado de borrado de datos: %s → %s', NEW.serial_number, OLD.data_wipe_status, NEW.data_wipe_status);
        END IF;
    END IF;
    
    -- Solo registrar si hubo cambios
    IF v_changes != '{}'::jsonb THEN
        IF v_description IS NULL THEN
            v_description := format('Activo actualizado: %s', NEW.serial_number);
        END IF;
        
        PERFORM log_audit_event(
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'STATUS_CHANGE'::audit_action_type
                WHEN OLD.location IS DISTINCT FROM NEW.location OR OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id THEN 'MOVE'::audit_action_type
                ELSE 'UPDATE'::audit_action_type
            END,
            'WAREHOUSE'::audit_module_type,
            v_description,
            'ASSET'::audit_entity_type,
            NEW.id,
            NEW.serial_number,
            v_ticket_id,
            NEW.batch_id,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_changes,
            v_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_asset_update_trigger
AFTER UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_update();

COMMENT ON FUNCTION trigger_audit_asset_update() IS 'Registra cambios en activos/series. Detecta cambios en status, location, current_warehouse_id, sales_price y data_wipe_status';
