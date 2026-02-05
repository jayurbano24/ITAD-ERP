-- =====================================================
-- FIX: Arreglar tabla audit_logs y eliminar triggers problemáticos
-- =====================================================

-- Paso 1: Eliminar triggers que puedan estar causando problemas
DROP TRIGGER IF EXISTS audit_assets_changes ON assets;
DROP TRIGGER IF EXISTS log_asset_changes ON assets;
DROP TRIGGER IF EXISTS assets_audit_trigger ON assets;

-- Paso 2: Eliminar funciones de trigger relacionadas
DROP FUNCTION IF EXISTS log_asset_changes();
DROP FUNCTION IF EXISTS audit_asset_changes();
DROP FUNCTION IF EXISTS log_changes();

-- Paso 3: Eliminar y recrear tabla audit_logs con estructura correcta
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paso 4: Crear índices
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Paso 5: RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can insert" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verificar
SELECT 'audit_logs recreado correctamente' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs';

