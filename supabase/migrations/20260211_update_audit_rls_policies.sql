-- =========================================================================
-- ACTUALIZAR POLÍTICAS RLS PARA PERMITIR INSERTS
-- =========================================================================

-- Desactivar RLS temporalmente para permitir datos de prueba
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Reactivar RLS con nuevas políticas más permisivas
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política simple: permitir INSERT para todos los usuarios autenticados
DROP POLICY IF EXISTS audit_logs_system_insert ON audit_logs;
CREATE POLICY audit_logs_insert_all ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política: permitir INSERT desde sesiones de sistema sin autenticación
DROP POLICY IF EXISTS audit_logs_insert_anon ON audit_logs;
CREATE POLICY audit_logs_insert_anon ON audit_logs
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Política de SELECT: Admin ve todo
DROP POLICY IF EXISTS audit_logs_admin_all ON audit_logs;
CREATE POLICY audit_logs_admin_select ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::TEXT IN ('admin', 'superadmin')
        )
    );

-- Política de SELECT: Otros usuarios ven todos los logs
DROP POLICY IF EXISTS audit_logs_supervisor_view ON audit_logs;
CREATE POLICY audit_logs_select_all ON audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Política de SELECT: Anon puede ver
CREATE POLICY audit_logs_select_anon ON audit_logs
    FOR SELECT
    TO anon
    USING (true);

COMMENT ON TABLE audit_logs IS 'Sistema completo de auditoría con RLS flexible para permitir inserts desde API';
