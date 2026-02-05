-- =================================================================
-- FIX: ERROR operator does not exist: jsonb - jsonb
-- Este script corrige los triggers de auditoría eliminando el uso
-- del operador '-' entre objetos jsonb, que no es estándar en PG.
-- Se reemplaza por el uso de to_jsonb(NEW) para registrar el estado.
-- =================================================================

-- 1. Corregir trigger de tickets
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
        -- CORRECCIÓN AQUÍ: Evitar operador '-' entre jsonb
        IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
            -- No podemos usar NEW - OLD directamente para diff, guardamos el estado nuevo completo
            v_changes := to_jsonb(NEW); 
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

-- 2. Corregir trigger de Work Orders
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

    v_status_old_label := OLD.status;
    v_status_new_label := NEW.status;

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
        -- CORRECCIÓN AQUÍ
        IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
            v_changes := to_jsonb(NEW);
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

-- 3. Corregir trigger de Assets
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

    v_status_old_label := OLD.status;
    v_status_new_label := NEW.status;

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
            -- CORRECCIÓN AQUÍ
            IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
                v_changes := to_jsonb(NEW);
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
