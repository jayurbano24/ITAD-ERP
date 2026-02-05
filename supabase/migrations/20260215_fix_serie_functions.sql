-- =====================================================
-- MIGRATION: Corregir funciones que usan NEW.serie
-- =====================================================

-- DROPEAR las tres funciones problemáticas
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS handle_asset_audit() CASCADE;
DROP FUNCTION IF EXISTS registrar_auditoria() CASCADE;

-- Dropear triggers asociados a estas funciones
DROP TRIGGER IF EXISTS audit_trigger ON assets CASCADE;
DROP TRIGGER IF EXISTS handle_asset_audit_trigger ON assets CASCADE;
DROP TRIGGER IF EXISTS registrar_auditoria_trigger ON assets CASCADE;

-- =====================================================
-- REEMPLAZAR CON FUNCIÓN CORRECTA
-- =====================================================
CREATE OR REPLACE FUNCTION handle_asset_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    module,
    entity_type,
    entity_id,
    asset_id,
    entity_reference,
    data_before,
    data_after,
    description,
    user_name,
    user_email,
    user_role,
    ticket_id,
    batch_id,
    changes_summary,
    created_at
  )
  VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'CREATE'
      WHEN 'UPDATE' THEN 'UPDATE'
      WHEN 'DELETE' THEN 'DELETE'
      ELSE TG_OP
    END,
    'WAREHOUSE',
    'ASSET',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.serial_number, OLD.serial_number),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    format('Cambio automático en activo %s', COALESCE(NEW.serial_number, OLD.serial_number)),
    'sistema',
    'sistema@itad.gt',
    'system',
    NULL,
    COALESCE(NEW.batch_id, OLD.batch_id),
    jsonb_build_object('trigger', 'handle_asset_audit', 'operation', TG_OP),
    NOW()
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en assets que use la función correcta
CREATE TRIGGER handle_asset_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON assets
FOR EACH ROW
EXECUTE FUNCTION handle_asset_audit();

-- =====================================================
-- Comentarios
-- =====================================================
COMMENT ON FUNCTION handle_asset_audit() IS 'Audita cambios en assets usando serial_number (no serie)';
