-- =====================================================
-- MIGRATION: Diagnosticar y corregir TODOS los triggers
-- =====================================================

-- Este script busca y elimina TODOS los triggers que contengan referencias a campos incorrectos

-- Primero, dropear TODOS los triggers en la tabla batches
DROP TRIGGER IF EXISTS trigger_audit_batch_create ON batches CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_batch_update ON batches CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_batch_delete ON batches CASCADE;

-- Dropear funciones asociadas a batches
DROP FUNCTION IF EXISTS trigger_audit_batch_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_batch_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_batch_delete() CASCADE;

-- Dropear TODOS los triggers en operations_tickets
DROP TRIGGER IF EXISTS trigger_audit_ticket_create ON operations_tickets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_ticket_update ON operations_tickets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_ticket_delete ON operations_tickets CASCADE;

-- Dropear funciones asociadas a operations_tickets
DROP FUNCTION IF EXISTS trigger_audit_ticket_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_ticket_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_ticket_delete() CASCADE;

-- Dropear TODOS los triggers en work_orders
DROP TRIGGER IF EXISTS trigger_audit_work_order_create ON work_orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_work_order_update ON work_orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_work_order_delete ON work_orders CASCADE;

-- Dropear funciones asociadas a work_orders
DROP FUNCTION IF EXISTS trigger_audit_work_order_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_work_order_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_work_order_delete() CASCADE;

-- =====================================================
-- Recrear SOLO los triggers necesarios para BATCHES
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_batch_update()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
BEGIN
    -- Solo registrar cambios de status si cambia
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_description := format('Lote %s: Estado: %s → %s', COALESCE(NEW.internal_batch_id, 'SIN-ID'), OLD.status, NEW.status);

        INSERT INTO audit_logs (
            action, module, entity_type, entity_id, entity_reference,
            description, user_name, user_email, user_role,
            ticket_id, batch_id,
            data_before, data_after, changes_summary,
            created_at
        ) VALUES (
            'UPDATE', 'LOGISTICS', 'BATCH', NEW.id, COALESCE(NEW.internal_batch_id, NEW.id::TEXT),
            v_description, 'sistema', 'sistema@itad.gt', 'system',
            NEW.ticket_id, NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), v_changes,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_batch_update
AFTER UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_batch_update();

-- =====================================================
-- Recrear SOLO los triggers necesarios para OPERATIONS_TICKETS
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_ticket_update()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
    v_status_old_label TEXT;
    v_status_new_label TEXT;
BEGIN
    -- Mapeo de status interno a nombre amigable
    v_status_old_label := CASE OLD.status
        WHEN 'open' THEN 'Abierto'
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'in_progress' THEN 'En proceso'
        WHEN 'closed' THEN 'Cerrado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE OLD.status
    END;
    v_status_new_label := CASE NEW.status
        WHEN 'open' THEN 'Abierto'
        WHEN 'pending' THEN 'Pendiente'
        WHEN 'in_progress' THEN 'En proceso'
        WHEN 'closed' THEN 'Cerrado'
        WHEN 'cancelled' THEN 'Cancelado'
        ELSE NEW.status
    END;

    -- Solo registrar cambios de status si cambia
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := jsonb_build_object(
            'status', jsonb_build_object(
                'old', OLD.status,
                'old_label', v_status_old_label,
                'new', NEW.status,
                'new_label', v_status_new_label
            )
        );
        v_description := format('Ticket %s: Estado: %s → %s', COALESCE(NEW.readable_id, 'SIN-ID'), v_status_old_label, v_status_new_label);
    ELSE
        IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
            v_changes := jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD));
            v_description := format('Ticket %s: Actualizado', COALESCE(NEW.readable_id, 'SIN-ID'));
        END IF;
    END IF;

    IF v_changes IS NOT NULL AND v_changes::text <> '{}' THEN
        INSERT INTO audit_logs (
            action, module, entity_type, entity_id, entity_reference,
            description, user_name, user_email, user_role,
            ticket_id,
            data_before, data_after, changes_summary,
            created_at
        ) VALUES (
            'UPDATE', 'TICKETS', 'TICKET', NEW.id, COALESCE(NEW.readable_id, NEW.id::TEXT),
            v_description, 'sistema', 'sistema@itad.gt', 'system',
            NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), v_changes,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_ticket_update ON operations_tickets;
CREATE TRIGGER trigger_audit_ticket_update
AFTER UPDATE ON operations_tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_ticket_update();

-- =====================================================
-- Recrear triggers para WORK_ORDERS (CORREGIDO y AUDITA TODO CAMBIO)
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
BEGIN
    v_user_name := COALESCE(current_setting('app.current_user', true), 'sistema');
    v_user_email := COALESCE(current_setting('app.current_email', true), 'sistema@itad.gt');
    v_user_role := COALESCE(current_setting('app.current_role', true), 'system');

    -- Mapeo de status interno a nombre amigable
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

    -- Registrar cualquier cambio (no solo status)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := jsonb_build_object(
            'status', jsonb_build_object(
                'old', OLD.status,
                'old_label', v_status_old_label,
                'new', NEW.status,
                'new_label', v_status_new_label
            )
        );
    ELSE
        IF row_to_json(OLD) IS DISTINCT FROM row_to_json(NEW) THEN
            v_changes := jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD));
        END IF;
    END IF;
    v_description := format('Orden de Trabajo %s: Actualizada', COALESCE(NEW.work_order_number, 'SIN-NUMERO'));

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

DROP TRIGGER IF EXISTS trigger_audit_work_order_update ON work_orders;
CREATE TRIGGER trigger_audit_work_order_update
AFTER UPDATE ON work_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_work_order_update();


-- =====================================================
-- Auditoría completa de movimientos en assets (series)
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
    v_status_old_label TEXT;
    v_status_new_label TEXT;
BEGIN
    v_user_name := COALESCE(current_setting('app.current_user', true), 'sistema');
    v_user_email := COALESCE(current_setting('app.current_email', true), 'sistema@itad.gt');
    v_user_role := COALESCE(current_setting('app.current_role', true), 'system');

    -- Mapeo de status interno a nombre amigable
    v_status_old_label := CASE OLD.status
        WHEN 'diagnosing' THEN 'Por Diagnosticar'
        WHEN 'in_progress' THEN 'En reparación'
        WHEN 'qc_pending' THEN 'QC pendiente'
        WHEN 'completed' THEN 'Completado'
        WHEN 'received' THEN 'Recibido'
        WHEN 'wiped' THEN 'Borrado'
        ELSE OLD.status
    END;
    v_status_new_label := CASE NEW.status
        WHEN 'diagnosing' THEN 'Por Diagnosticar'
        WHEN 'in_progress' THEN 'En reparación'
        WHEN 'qc_pending' THEN 'QC pendiente'
        WHEN 'completed' THEN 'Completado'
        WHEN 'received' THEN 'Recibido'
        WHEN 'wiped' THEN 'Borrado'
        ELSE NEW.status
    END;

    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_description := format('Serie %s: Creada', NEW.serial_number);
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_description := format('Serie %s: Actualizada', NEW.serial_number);
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := jsonb_build_object(
                'status', jsonb_build_object(
                    'old', OLD.status,
                    'old_label', v_status_old_label,
                    'new', NEW.status,
                    'new_label', v_status_new_label
                )
            );
        ELSE
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

DROP TRIGGER IF EXISTS trigger_audit_asset_changes ON assets;
CREATE TRIGGER trigger_audit_asset_changes
AFTER INSERT OR UPDATE OR DELETE ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_changes();

-- =====================================================
-- Comentarios
-- =====================================================

-- Comentarios
COMMENT ON FUNCTION trigger_audit_batch_update() IS 'Audita cambios en lotes';
COMMENT ON FUNCTION trigger_audit_ticket_update() IS 'Audita cambios en tickets';
COMMENT ON FUNCTION trigger_audit_work_order_update() IS 'Audita cambios de estado en órdenes de trabajo.';
COMMENT ON FUNCTION trigger_audit_asset_changes() IS 'Audita cambios en series de assets.';
