-- Mejora de triggers para descripciones detalladas en auditoría
-- Este script reemplaza las funciones de trigger existentes con versiones más inteligentes
-- que generan descripciones legibles para humanos (e.g. "Enviada a Control de Calidad" vs "Actualizada")

-- =====================================================
-- 1. Trigger para WORK ORDERS (Mejorado)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_work_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
    v_user_name TEXT;
    v_user_email TEXT;
    v_user_role TEXT;
    v_status_old_label TEXT;
    v_status_new_label TEXT;
    v_details TEXT := '';
BEGIN
    v_user_name := COALESCE(current_setting('app.current_user', true), 'sistema');
    v_user_email := COALESCE(current_setting('app.current_email', true), 'sistema@itad.gt');
    v_user_role := COALESCE(current_setting('app.current_role', true), 'system');

    -- Mapeo de status
    v_status_old_label := CASE OLD.status
        WHEN 'open' THEN 'Abierta'
        WHEN 'in_progress' THEN 'En reparación'
        WHEN 'waiting_parts' THEN 'Esperando repuestos'
        WHEN 'waiting_quote' THEN 'Esperando cotización'
        WHEN 'quote_approved' THEN 'Cotización aprobada'
        WHEN 'quote_rejected' THEN 'Cotización rechazada'
        WHEN 'waiting_seedstock' THEN 'Esperando semilla'
        WHEN 'qc_pending' THEN 'QC pendiente'
        WHEN 'qc_passed' THEN 'QC aprobado'
        WHEN 'qc_failed' THEN 'QC fallido'
        WHEN 'ready_to_ship' THEN 'Listo para envío'
        WHEN 'completed' THEN 'Completada'
        WHEN 'cancelled' THEN 'Cancelada'
        ELSE OLD.status
    END;
    v_status_new_label := CASE NEW.status
        WHEN 'open' THEN 'Abierta'
        WHEN 'in_progress' THEN 'En reparación'
        WHEN 'waiting_parts' THEN 'Esperando repuestos'
        WHEN 'waiting_quote' THEN 'Esperando cotización'
        WHEN 'quote_approved' THEN 'Cotización aprobada'
        WHEN 'quote_rejected' THEN 'Cotización rechazada'
        WHEN 'waiting_seedstock' THEN 'Esperando semilla'
        WHEN 'qc_pending' THEN 'QC pendiente'
        WHEN 'qc_passed' THEN 'QC aprobado'
        WHEN 'qc_failed' THEN 'QC fallido'
        WHEN 'ready_to_ship' THEN 'Listo para envío'
        WHEN 'completed' THEN 'Completada'
        WHEN 'cancelled' THEN 'Cancelada'
        ELSE NEW.status
    END;

    -- Detectar cambios y generar descripción
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := jsonb_build_object(
            'status', jsonb_build_object('old', OLD.status, 'new', NEW.status, 'new_label', v_status_new_label)
        );
        
        -- Descripciones inteligentes basadas en el cambio de estado
        IF NEW.status = 'qc_pending' THEN
            v_description := format('OS #%s: Enviada a Control de Calidad', NEW.work_order_number);
        ELSIF NEW.status = 'in_progress' THEN
            v_description := format('OS #%s: Iniciada Reparación', NEW.work_order_number);
        ELSIF NEW.status = 'completed' THEN
            v_description := format('OS #%s: Completada', NEW.work_order_number);
        ELSIF NEW.status = 'qc_failed' THEN
            v_description := format('OS #%s: Falló Control de Calidad', NEW.work_order_number);
        ELSE
            v_description := format('OS #%s: Cambio de estado a %s', NEW.work_order_number, v_status_new_label);
        END IF;

    ELSE
        -- Si no cambió el estado, registrar cambios genéricos pero detallados
        IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
            v_changes := jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD));
            
            -- Detectar cambios específicos para enriquecer la descripción
            IF (v_changes ? 'repair_mode') THEN
                 v_details := v_details || ' (Modo Reparación)';
            END IF;
            IF (v_changes ? 'technician_notes') THEN
                 v_details := v_details || ' (Notas Actualizadas)';
            END IF;
            
            v_description := format('OS #%s: Datos Actualizados%s', NEW.work_order_number, v_details);
            
            -- Si solo se actualizó updated_at, lo ignoramos para no llenar la bitácora
            IF (v_changes - 'updated_at') = '{}'::jsonb THEN
                RETURN NEW;
            END IF;
        ELSE
            -- Si no hubo cambios reales, salir
            RETURN NEW;
        END IF;
    END IF;

    -- (Bloque de repair_mode eliminado porque la columna no existe en la tabla work_orders)
    -- Si repair_mode llega a existir en el futuro, se puede descomentar o ajustar


    INSERT INTO audit_logs (
        action, module, entity_type, entity_id, entity_reference,
        description, user_name, user_email, user_role,
        ticket_id, work_order_id, asset_id,
        data_before, data_after, changes_summary,
        created_at
    ) VALUES (
        'UPDATE', 'WORKSHOP', 'WORK_ORDER', NEW.id, COALESCE(NEW.work_order_number, NEW.id::TEXT),
        v_description, v_user_name, v_user_email, v_user_role,
        NEW.ticket_id, NEW.id, NEW.asset_id,
        to_jsonb(OLD), to_jsonb(NEW), v_changes,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No need to drop/create trigger, just replacing function is enough for existing triggers using it.
-- But ensuring trigger is bound is good practice.

-- =====================================================
-- 2. Trigger para ASSETS (Series) (Mejorado)
-- =====================================================
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
BEGIN
    v_user_name := COALESCE(current_setting('app.current_user', true), 'sistema');
    v_user_email := COALESCE(current_setting('app.current_email', true), 'sistema@itad.gt');
    v_user_role := COALESCE(current_setting('app.current_role', true), 'system');

    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_description := format('Serie %s: Ingresada al sistema', NEW.serial_number);
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        
        IF OLD.status IS DISTINCT FROM NEW.status THEN
             v_status_new_label := NEW.status; -- Simplificado, idealmente usar CASE
             v_description := format('Serie %s: Cambio de estado a %s', NEW.serial_number, v_status_new_label);
             v_changes := jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        ELSIF OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id THEN
             v_description := format('Serie %s: Movimiento de Bodega', NEW.serial_number);
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
