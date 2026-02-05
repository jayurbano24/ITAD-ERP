-- =====================================================
-- MIGRACIÓN: Añadir campos de borrado de datos a assets
-- Cumplimiento R2v3 - Data Sanitization
-- =====================================================

-- PASO 1: Añadir nuevos valores al enum asset_status
-- Nota: ALTER TYPE ADD VALUE no puede estar dentro de un bloque transaccional
-- Por eso lo hacemos con DO blocks que capturan errores si ya existen

DO $$ 
BEGIN
    ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'wiping';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    ALTER TYPE asset_status ADD VALUE IF NOT EXISTS 'wiped';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- PASO 2: Añadir columnas para tracking de borrado
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS wipe_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wipe_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS wipe_certificate_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS wipe_software VARCHAR(50),
ADD COLUMN IF NOT EXISTS wipe_result VARCHAR(20),
ADD COLUMN IF NOT EXISTS wipe_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PASO 3: Crear tabla de audit_logs si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    performed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 4: Crear índices para mejorar rendimiento
-- Índice para búsqueda de activos por estado de borrado
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- Índice para certificados de borrado
CREATE INDEX IF NOT EXISTS idx_assets_wipe_certificate ON assets(wipe_certificate_id) 
WHERE wipe_certificate_id IS NOT NULL;

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- PASO 5: Comentarios de documentación
COMMENT ON COLUMN assets.wipe_started_at IS 'Timestamp cuando se inició el proceso de borrado';
COMMENT ON COLUMN assets.wipe_completed_at IS 'Timestamp cuando se completó el proceso de borrado';
COMMENT ON COLUMN assets.wipe_certificate_id IS 'ID del certificado de borrado (requerido por R2v3)';
COMMENT ON COLUMN assets.wipe_software IS 'Software utilizado para el borrado (blancco, killdisk, etc)';
COMMENT ON COLUMN assets.wipe_result IS 'Resultado del borrado (success, failed, partial)';
COMMENT ON COLUMN assets.wipe_notes IS 'Notas adicionales del proceso de borrado';

-- PASO 6: RLS para audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay (para poder recrearlas)
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;

-- Crear políticas RLS para audit_logs
CREATE POLICY "Admins can view all audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
    FOR SELECT USING (performed_by = auth.uid());

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- PASO 7: Verificar que la migración se completó
SELECT 'Valores del enum asset_status:' as info;
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'asset_status'::regtype
ORDER BY enumsortorder;

SELECT 'Columnas de wipe añadidas:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name LIKE 'wipe%'
ORDER BY column_name;
