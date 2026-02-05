-- =====================================================
-- MIGRATION: Eliminar TODOS los triggers de auditoría duplicados/problemáticos
-- =====================================================

-- PASO 1: Eliminar TODOS los triggers de auditoría
DROP TRIGGER IF EXISTS tr_audit_assets ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_create ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_update ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_delete ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_batch_update ON batches CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_ticket_update ON operations_tickets CASCADE;

-- PASO 2: Eliminar las funciones de auditoría problemáticas
DROP FUNCTION IF EXISTS handle_asset_audit() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_delete() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_batch_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_ticket_update() CASCADE;

-- CONFIRMACIÓN
SELECT 'Triggers de auditoría eliminados. Sistema listo para operaciones sin auditoría automática.' as status;

-- NOTAS:
-- Los triggers de timestamps y generadores (asset_set_internal_tag, update_assets_updated_at, etc) 
-- se mantienen porque no son problemáticos
-- La auditoría se registrará manualmente a través del endpoint /api/audit/manual-log
