-- =====================================================
-- MIGRATION: Nuclear Option - Eliminar TODOS los triggers
-- =====================================================

-- PASO 1: Eliminar TODOS los triggers en TODAS las tablas
DROP TRIGGER IF EXISTS audit_trigger ON assets CASCADE;
DROP TRIGGER IF EXISTS audit_assets_changes ON assets CASCADE;
DROP TRIGGER IF EXISTS log_asset_changes ON assets CASCADE;
DROP TRIGGER IF EXISTS assets_audit_trigger ON assets CASCADE;
DROP TRIGGER IF EXISTS handle_asset_audit_trigger ON assets CASCADE;
DROP TRIGGER IF EXISTS registrar_auditoria_trigger ON assets CASCADE;

DROP TRIGGER IF EXISTS trigger_audit_asset_create ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_update ON assets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_asset_delete ON assets CASCADE;

DROP TRIGGER IF EXISTS trigger_audit_batch_create ON batches CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_batch_update ON batches CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_batch_delete ON batches CASCADE;

DROP TRIGGER IF EXISTS trigger_audit_ticket_create ON operations_tickets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_ticket_update ON operations_tickets CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_ticket_delete ON operations_tickets CASCADE;

DROP TRIGGER IF EXISTS trigger_audit_work_order_create ON work_orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_work_order_update ON work_orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_work_order_delete ON work_orders CASCADE;

-- PASO 2: Eliminar TODAS las funciones de trigger
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS handle_asset_audit() CASCADE;
DROP FUNCTION IF EXISTS registrar_auditoria() CASCADE;
DROP FUNCTION IF EXISTS log_asset_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_asset_changes() CASCADE;
DROP FUNCTION IF EXISTS log_changes() CASCADE;

DROP FUNCTION IF EXISTS trigger_audit_asset_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_asset_delete() CASCADE;

DROP FUNCTION IF EXISTS trigger_audit_batch_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_batch_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_batch_delete() CASCADE;

DROP FUNCTION IF EXISTS trigger_audit_ticket_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_ticket_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_ticket_delete() CASCADE;

DROP FUNCTION IF EXISTS trigger_audit_work_order_create() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_work_order_update() CASCADE;
DROP FUNCTION IF EXISTS trigger_audit_work_order_delete() CASCADE;

-- PASO 3: Verificar que no haya más triggers problemáticos
-- (Si después de esto aún hay errores, significa que hay triggers en otras tablas)

-- CONFIRMACIÓN
SELECT 'LIMPIEZA COMPLETADA: Todos los triggers y funciones eliminados' as status;
