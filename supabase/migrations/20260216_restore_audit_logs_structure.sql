-- =====================================================
-- MIGRATION: Restaurar estructura completa de audit_logs
-- =====================================================

-- Eliminar la tabla actual que está incompleta
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Recrear la tabla con TODAS las columnas necesarias
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_reference TEXT,
    description TEXT,
    user_name TEXT DEFAULT 'sistema',
    user_email TEXT DEFAULT 'sistema@itad.gt',
    user_role TEXT DEFAULT 'system',
    ticket_id UUID,
    batch_id UUID,
    asset_id UUID,
    data_before JSONB,
    data_after JSONB,
    changes_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para optimización
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_reference ON audit_logs(entity_reference);
CREATE INDEX idx_audit_logs_ticket ON audit_logs(ticket_id);
CREATE INDEX idx_audit_logs_batch ON audit_logs(batch_id);
CREATE INDEX idx_audit_logs_asset ON audit_logs(asset_id);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permisivas para desarrollo
DROP POLICY IF EXISTS "audit_logs_all" ON audit_logs;
CREATE POLICY "audit_logs_all" ON audit_logs 
    FOR ALL 
    TO authenticated, anon 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs 
    FOR INSERT 
    TO authenticated, anon 
    WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE audit_logs IS 'Registro completo de auditoría del sistema con trazabilidad de tickets, lotes y series';
COMMENT ON COLUMN audit_logs.entity_reference IS 'Referencia legible (serial_number, batch_id, ticket_id)';
COMMENT ON COLUMN audit_logs.changes_summary IS 'Resumen de cambios en JSONB';
