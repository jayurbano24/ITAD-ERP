-- =====================================================
-- FIX: Audit Log - Nombres de Bodegas en Movimientos
-- =====================================================
-- Este script actualiza el trigger trigger_audit_asset_changes para que,
-- al detectar un cambio de bodega, busque los nombres reales de las bodegas
-- (origen y destino) y los incluya en la descripción del log.

CREATE OR REPLACE FUNCTION trigger_audit_asset_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
    v_user_name TEXT;
    v_user_email TEXT;
    v_user_role TEXT;
    v_status_new_label TEXT;
    
    -- Variables para resolución de usuario
    v_user_id UUID;
    v_profile_name TEXT;
    v_profile_role TEXT;

    -- Variables para nombres de bodegas
    v_old_warehouse_name TEXT;
    v_new_warehouse_name TEXT;
BEGIN
    -- Intentar resolver usuario desde Auth y Perfiles
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        BEGIN
            SELECT full_name, role INTO v_profile_name, v_profile_role
            FROM public.profiles
            WHERE id = v_user_id;
        EXCEPTION WHEN OTHERS THEN
            v_profile_name := NULL;
        END;
    END IF;

    v_user_name := COALESCE(v_profile_name, current_setting('app.current_user', true), 'sistema');
    v_user_role := COALESCE(v_profile_role, current_setting('app.current_role', true), 'system');
    v_user_email := COALESCE(current_setting('app.current_email', true), 'sistema@itad.gt');

    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_description := format('Serie %s: Ingresada al sistema', NEW.serial_number);
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        
        IF OLD.status IS DISTINCT FROM NEW.status THEN
             v_status_new_label := NEW.status;
             v_description := format('Serie %s: Cambio de estado a %s', NEW.serial_number, v_status_new_label);
             v_changes := jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        
        ELSIF OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id THEN
             -- Buscar nombres de bodegas
             IF OLD.current_warehouse_id IS NOT NULL THEN
                SELECT name INTO v_old_warehouse_name FROM warehouses WHERE id = OLD.current_warehouse_id;
             END IF;
             
             IF NEW.current_warehouse_id IS NOT NULL THEN
                SELECT name INTO v_new_warehouse_name FROM warehouses WHERE id = NEW.current_warehouse_id;
             END IF;

             -- Formatear descripción detallada
             v_description := format('Serie %s: Movimiento de %s hacia %s', 
                                     NEW.serial_number, 
                                     COALESCE(v_old_warehouse_name, 'No asignada'),
                                     COALESCE(v_new_warehouse_name, 'No asignada'));

             v_changes := jsonb_build_object('bodega', jsonb_build_object('old', OLD.current_warehouse_id, 'new', NEW.current_warehouse_id));
        ELSE
             v_description := format('Serie %s: Datos Actualizados', NEW.serial_number);
             IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
                v_changes := jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD));
             END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_description := format('Serie %s: Eliminada', OLD.serial_number);
        v_changes := to_jsonb(OLD);
    END IF;

    INSERT INTO audit_logs (
        action, module, entity_type, entity_id, entity_reference,
        description, user_name, user_email, user_role,
        asset_id, data_before, data_after, changes_summary, created_at
    ) VALUES (
        v_action, 'LOGISTICS', 'ASSET',
        COALESCE(NEW.id, OLD.id),
        COALESCE(NEW.serial_number, OLD.serial_number, COALESCE(NEW.id, OLD.id)::TEXT),
        v_description, v_user_name, v_user_email, v_user_role,
        COALESCE(NEW.id, OLD.id),
        to_jsonb(OLD), to_jsonb(NEW), v_changes,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
