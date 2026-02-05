-- =====================================================
-- MIGRACIÓN: Crear tabla asset_wipe_evidence
-- Almacena evidencia fotográfica y reportes de borrado
-- =====================================================

-- PASO 1: Eliminar tabla si existe (para reconstruir desde cero)
DROP TABLE IF EXISTS asset_wipe_evidence CASCADE;

-- PASO 2: Crear tabla asset_wipe_evidence con todas las columnas
CREATE TABLE asset_wipe_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'xml', 'pdf')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  content_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 3: Crear índices para optimizar búsquedas
CREATE INDEX idx_asset_wipe_evidence_asset_id ON asset_wipe_evidence(asset_id);
CREATE INDEX idx_asset_wipe_evidence_type ON asset_wipe_evidence(type);
CREATE INDEX idx_asset_wipe_evidence_created_at ON asset_wipe_evidence(created_at DESC);

-- PASO 4: Habilitar RLS
ALTER TABLE asset_wipe_evidence ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear políticas RLS
-- Política 1: Usuarios autenticados pueden insertar
CREATE POLICY "Authenticated insert wipe evidence" ON asset_wipe_evidence
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política 2: Usuarios autenticados pueden leer
CREATE POLICY "Authenticated select wipe evidence" ON asset_wipe_evidence
    FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Política 3: Super admins pueden actualizar
CREATE POLICY "Admin update wipe evidence" ON asset_wipe_evidence
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Política 4: Super admins pueden eliminar
CREATE POLICY "Admin delete wipe evidence" ON asset_wipe_evidence
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- PASO 6: Comentarios de documentación
COMMENT ON TABLE asset_wipe_evidence IS 'Almacena evidencia de borrado de datos: fotos, reportes XML, y PDFs';
COMMENT ON COLUMN asset_wipe_evidence.id IS 'Identificador único del registro de evidencia';
COMMENT ON COLUMN asset_wipe_evidence.asset_id IS 'ID del activo asociado (llave foránea)';
COMMENT ON COLUMN asset_wipe_evidence.type IS 'Tipo de evidencia: photo, xml, o pdf';
COMMENT ON COLUMN asset_wipe_evidence.file_name IS 'Nombre original del archivo';
COMMENT ON COLUMN asset_wipe_evidence.file_url IS 'URL pública del archivo en storage';
COMMENT ON COLUMN asset_wipe_evidence.content_type IS 'MIME type del archivo (ej: image/jpeg, application/pdf)';
COMMENT ON COLUMN asset_wipe_evidence.file_size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN asset_wipe_evidence.uploaded_by IS 'ID del usuario que subió el archivo';
COMMENT ON COLUMN asset_wipe_evidence.created_at IS 'Timestamp de creación del registro';
COMMENT ON COLUMN asset_wipe_evidence.updated_at IS 'Timestamp de última actualización';

-- PASO 7: Crear función para insertar evidencia (evita problemas de schema cache)
CREATE OR REPLACE FUNCTION insert_wipe_evidence(
  p_asset_id UUID,
  p_type TEXT,
  p_file_name TEXT,
  p_file_url TEXT,
  p_content_type TEXT,
  p_file_size BIGINT,
  p_uploaded_by UUID
) RETURNS TABLE (
  id UUID,
  asset_id UUID,
  type TEXT,
  file_name TEXT,
  file_url TEXT,
  content_type TEXT,
  file_size BIGINT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO asset_wipe_evidence (
    asset_id, 
    type, 
    file_name, 
    file_url, 
    content_type, 
    file_size, 
    uploaded_by
  )
  VALUES (
    p_asset_id,
    p_type,
    p_file_name,
    p_file_url,
    p_content_type,
    p_file_size,
    p_uploaded_by
  )
  RETURNING 
    asset_wipe_evidence.id,
    asset_wipe_evidence.asset_id,
    asset_wipe_evidence.type,
    asset_wipe_evidence.file_name,
    asset_wipe_evidence.file_url,
    asset_wipe_evidence.content_type,
    asset_wipe_evidence.file_size,
    asset_wipe_evidence.uploaded_by,
    asset_wipe_evidence.created_at,
    asset_wipe_evidence.updated_at;
END;
$$;

-- PASO 8: Verificación final
SELECT 'Tabla asset_wipe_evidence creada exitosamente' as resultado;

-- Mostrar estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'asset_wipe_evidence'
ORDER BY ordinal_position;
