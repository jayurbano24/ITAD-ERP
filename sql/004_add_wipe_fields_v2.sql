-- =====================================================
-- MIGRACIÓN: Añadir campos de borrado de datos a assets
-- Cumplimiento R2v3 - Data Sanitization
-- =====================================================

-- PASO 1: Añadir nuevos valores al enum asset_status
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'asset_status'::regtype 
        AND enumlabel = 'wiping'
    ) THEN
        ALTER TYPE asset_status ADD VALUE 'wiping';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'asset_status'::regtype 
        AND enumlabel = 'wiped'
    ) THEN
        ALTER TYPE asset_status ADD VALUE 'wiped';
    END IF;
END $$;

-- PASO 2: Añadir columnas para tracking de borrado en assets
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS wipe_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wipe_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wipe_certificate_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS wipe_software VARCHAR(50),
ADD COLUMN IF NOT EXISTS wipe_result VARCHAR(20),
ADD COLUMN IF NOT EXISTS wipe_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PASO 3: Crear o actualizar tabla audit_logs
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

-- PASO 4: Crear índices
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_wipe_certificate ON assets(wipe_certificate_id) 
WHERE wipe_certificate_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- PASO 5: RLS para audit_logs (políticas simplificadas)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política simple: super_admin puede ver todo
CREATE POLICY "Super admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Los usuarios pueden ver sus propios logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (performed_by = auth.uid());

-- Usuarios autenticados pueden insertar
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Verificación final
SELECT 'Migración completada exitosamente' as resultado;

SELECT enumlabel as "Valores de asset_status" 
FROM pg_enum 
WHERE enumtypid = 'asset_status'::regtype
ORDER BY enumsortorder;
