-- =====================================================
-- MIGRATION: Corregir triggers que usan "serie" en lugar de "serial_number"
-- =====================================================

-- Verificar y reparar cualquier trigger o función que cause el error
-- "record "new" has no field "serie""

-- Opción 1: Si hay una función que se referencia directamente a NEW.serie, cambiarla
-- Opción 2: Crear o actualizar triggers que manejen correctamente el UPDATE a assets

-- Primero, dejar caer todos los triggers existentes en assets para una limpieza completa
DROP TRIGGER IF EXISTS trigger_audit_asset_create ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_update ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_delete ON assets CASCADE;

-- Dejar caer las funciones de trigger
DROP FUNCTION IF EXISTS trigger_audit_asset_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_delete() CASCADE;

-- =====================================================
-- Crear función correcta para INSERT en assets
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_asset_create()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
BEGIN
    v_description := format('Activo creado: %s', COALESCE(NEW.serial_number, NEW.internal_tag, 'SIN-IDENTIFICAR'));

    INSERT INTO audit_logs (
        action, module, entity_type, entity_id, entity_reference,
        description, user_name, user_email, user_role,
        batch_id, asset_id, data_after, changes_summary,
        created_at
    ) VALUES (
        'CREATE', 'WAREHOUSE', 'ASSET', NEW.id, COALESCE(NEW.serial_number, NEW.internal_tag),
        v_description, 'sistema', 'sistema@itad.gt', 'system',
        NEW.batch_id, NEW.id, to_jsonb(NEW), jsonb_build_object('field', 'created'),
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Crear función correcta para UPDATE en assets
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_asset_update()
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::JSONB;
    v_description TEXT;
    v_batch_ticket_id UUID;
BEGIN
    -- Detectar cambios en status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Estado: %s → %s', NEW.serial_number, OLD.status, NEW.status);
        ELSE
            v_description := v_description || format('; Estado: %s → %s', OLD.status, NEW.status);
        END IF;
    END IF;

    -- Detectar cambios en location
    IF OLD.location IS DISTINCT FROM NEW.location THEN
        v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Ubicación: %s → %s', NEW.serial_number, OLD.location, NEW.location);
        ELSE
            v_description := v_description || format('; Ubicación: %s → %s', OLD.location, NEW.location);
        END IF;
    END IF;

    -- Detectar cambios en current_warehouse_id
    IF OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id THEN
        v_changes := v_changes || jsonb_build_object('current_warehouse_id', jsonb_build_object('old', OLD.current_warehouse_id, 'new', NEW.current_warehouse_id));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Almacén: %s → %s', NEW.serial_number, OLD.current_warehouse_id, NEW.current_warehouse_id);
        ELSE
            v_description := v_description || format('; Almacén: %s → %s', OLD.current_warehouse_id, NEW.current_warehouse_id);
        END IF;
    END IF;

    -- Detectar cambios en sales_price
    IF OLD.sales_price IS DISTINCT FROM NEW.sales_price THEN
        v_changes := v_changes || jsonb_build_object('sales_price', jsonb_build_object('old', OLD.sales_price, 'new', NEW.sales_price));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Precio: %s → %s', NEW.serial_number, OLD.sales_price, NEW.sales_price);
        ELSE
            v_description := v_description || format('; Precio: %s → %s', OLD.sales_price, NEW.sales_price);
        END IF;
    END IF;

    -- Detectar cambios en data_wipe_status
    IF OLD.data_wipe_status IS DISTINCT FROM NEW.data_wipe_status THEN
        v_changes := v_changes || jsonb_build_object('data_wipe_status', jsonb_build_object('old', OLD.data_wipe_status, 'new', NEW.data_wipe_status));
        IF v_description IS NULL THEN
            v_description := format('Activo %s: Estado de borrado de datos: %s → %s', NEW.serial_number, OLD.data_wipe_status, NEW.data_wipe_status);
        ELSE
            v_description := v_description || format('; Estado de borrado: %s → %s', OLD.data_wipe_status, NEW.data_wipe_status);
        END IF;
    END IF;

    -- Si hay cambios, insertar en audit_logs
    IF v_changes != '{}'::JSONB THEN
        -- Obtener el ticket_id del batch si existe
        IF NEW.batch_id IS NOT NULL THEN
            SELECT ticket_id INTO v_batch_ticket_id FROM batches WHERE id = NEW.batch_id LIMIT 1;
        END IF;

        INSERT INTO audit_logs (
            action, module, entity_type, entity_id, entity_reference,
            description, user_name, user_email, user_role,
            ticket_id, batch_id, asset_id,
            data_before, data_after, changes_summary,
            created_at
        ) VALUES (
            'UPDATE', 'WAREHOUSE', 'ASSET', NEW.id, COALESCE(NEW.serial_number, NEW.internal_tag),
            v_description, 'sistema', 'sistema@itad.gt', 'system',
            v_batch_ticket_id, NEW.batch_id, NEW.id,
            to_jsonb(OLD), to_jsonb(NEW), v_changes,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Crear función correcta para DELETE en assets
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_audit_asset_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_description TEXT;
    v_batch_ticket_id UUID;
BEGIN
    v_description := format('Activo eliminado: %s (%s)', OLD.serial_number, OLD.internal_tag);

    -- Obtener el ticket_id del batch si existe
    IF OLD.batch_id IS NOT NULL THEN
        SELECT ticket_id INTO v_batch_ticket_id FROM batches WHERE id = OLD.batch_id LIMIT 1;
    END IF;

    INSERT INTO audit_logs (
        action, module, entity_type, entity_id, entity_reference,
        description, user_name, user_email, user_role,
        ticket_id, batch_id, asset_id,
        data_before, changes_summary,
        created_at
    ) VALUES (
        'DELETE', 'WAREHOUSE', 'ASSET', OLD.id, COALESCE(OLD.serial_number, OLD.internal_tag),
        v_description, 'sistema', 'sistema@itad.gt', 'system',
        v_batch_ticket_id, OLD.batch_id, OLD.id,
        to_jsonb(OLD), jsonb_build_object('deleted', true),
        NOW()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Recrear los triggers con las funciones corregidas
-- =====================================================
CREATE TRIGGER trigger_audit_asset_create
AFTER INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_create();

CREATE TRIGGER trigger_audit_asset_update
AFTER UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_update();

CREATE TRIGGER trigger_audit_asset_delete
AFTER DELETE ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_delete();

-- =====================================================
-- Comentarios de función
-- =====================================================
COMMENT ON FUNCTION trigger_audit_asset_create() IS 'Audita creación de nuevos activos/series usando serial_number como referencia';
COMMENT ON FUNCTION trigger_audit_asset_update() IS 'Audita cambios en activos/series: status, location, current_warehouse_id, sales_price y data_wipe_status';
COMMENT ON FUNCTION trigger_audit_asset_delete() IS 'Audita eliminación de activos/series';
