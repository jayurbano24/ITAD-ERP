-- Hotfix: Reconstruir tabla audit_logs con la columna faltante work_order_id
-- Este paso es necesario porque el esquema actual no coincide con lo esperado por los triggers

-- Agregar columnas faltantes a audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL;

-- Actualizar la constraint de chequeo para incluir work_order_id
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_check CHECK (
    (entity_type = 'TICKET' AND ticket_id IS NOT NULL) OR
    (entity_type = 'BATCH' AND batch_id IS NOT NULL) OR
    (entity_type = 'ASSET' AND asset_id IS NOT NULL) OR
    (entity_type = 'WORK_ORDER' AND work_order_id IS NOT NULL) OR
    entity_type IN ('SALE', 'INVOICE', 'PAYMENT', 'USER', 'CLIENT')
);

-- Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_audit_logs_work_order_id ON audit_logs(work_order_id);

-- Actualizar la función helper para aceptar work_order_id
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action audit_action_type,
    p_module audit_module_type,
    p_description TEXT,
    p_entity_type audit_entity_type,
    p_entity_id UUID,
    p_entity_reference TEXT DEFAULT NULL,
    p_ticket_id UUID DEFAULT NULL,
    p_batch_id UUID DEFAULT NULL,
    p_asset_id UUID DEFAULT NULL,
    p_work_order_id UUID DEFAULT NULL,
    p_data_before JSONB DEFAULT NULL,
    p_data_after JSONB DEFAULT NULL,
    p_changes_summary JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_user_name TEXT;
    v_user_email TEXT;
    v_user_role TEXT;
BEGIN
    -- Obtener datos del usuario si no se proporcionó user_id
    IF p_user_id IS NULL THEN
        BEGIN
            p_user_id := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            p_user_id := NULL;
        END;
    END IF;
    
    -- Obtener información del perfil del usuario
    IF p_user_id IS NOT NULL THEN
        BEGIN
            SELECT 
                p.full_name,
                p.email,
                p.role::TEXT
            INTO v_user_name, v_user_email, v_user_role
            FROM profiles p
            WHERE p.id = p_user_id;
        EXCEPTION WHEN OTHERS THEN
            v_user_name := NULL;
            v_user_email := NULL;
            v_user_role := NULL;
        END;
    END IF;
    
    -- Insertar registro de auditoría con la nueva columna
    INSERT INTO audit_logs (
        action,
        module,
        description,
        user_id,
        user_name,
        user_email,
        user_role,
        entity_type,
        entity_id,
        entity_reference,
        ticket_id,
        batch_id,
        asset_id,
        work_order_id,
        data_before,
        data_after,
        changes_summary
    ) VALUES (
        p_action,
        p_module,
        p_description,
        p_user_id,
        v_user_name,
        v_user_email,
        v_user_role,
        p_entity_type,
        p_entity_id,
        p_entity_reference,
        p_ticket_id,
        p_batch_id,
        p_asset_id,
        p_work_order_id,
        p_data_before,
        p_data_after,
        p_changes_summary
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;
