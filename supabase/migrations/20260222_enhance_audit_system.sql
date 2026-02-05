-- Add missing columns to audit_logs to fully meet the user requirements
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS http_method TEXT,
    ADD COLUMN IF NOT EXISTS endpoint TEXT,
    ADD COLUMN IF NOT EXISTS additional_data JSONB;

COMMENT ON COLUMN audit_logs.session_id IS 'ID de sesión del usuario (si aplica)';
COMMENT ON COLUMN audit_logs.http_method IS 'Método HTTP (GET, POST, PUT, DELETE)';
COMMENT ON COLUMN audit_logs.endpoint IS 'URL o Endpoint accedido';
COMMENT ON COLUMN audit_logs.additional_data IS 'Datos adicionales arbitrarios en formato JSON';

-- Update the log_audit_event function to accept these new parameters
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
    p_data_before JSONB DEFAULT NULL,
    p_data_after JSONB DEFAULT NULL,
    p_changes_summary JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_http_method TEXT DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
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
    
    -- Obtener información del perfil del usuario desde profiles
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
    
    -- Insertar registro de auditoría
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
        data_before,
        data_after,
        changes_summary,
        ip_address,
        user_agent,
        session_id,
        http_method,
        endpoint,
        additional_data
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
        p_data_before,
        p_data_after,
        p_changes_summary,
        p_ip_address,
        p_user_agent,
        p_session_id,
        p_http_method,
        p_endpoint,
        p_additional_data
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- View for detailed audit logs with human-readable information
CREATE OR REPLACE VIEW v_auditoria_detallada AS
SELECT 
    al.*,
    p.full_name as profile_name,
    p.email as profile_email,
    p.role as profile_role
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id;

-- Additional indices for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_http_method ON audit_logs(http_method);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint ON audit_logs(endpoint);
