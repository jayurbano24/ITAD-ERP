-- =========================================================================
-- FLEXIBLE CONSTRAINT PARA PERMITIR AUDITORÍA SIN FOREIGN KEYS
-- =========================================================================

-- Remover la constraint antigua
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_check;

-- Agregar nueva constraint más flexible (permite NULL en los FKs)
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_entity_check CHECK (
    entity_type IN ('TICKET', 'BATCH', 'ASSET', 'WORK_ORDER', 'SALE', 'INVOICE', 'PAYMENT', 'USER', 'CLIENT')
);

-- Comentario explicativo
COMMENT ON CONSTRAINT audit_logs_entity_check ON audit_logs IS 'Valida que el entity_type sea uno de los tipos permitidos. Los IDs relacionados pueden ser NULL para datos de prueba.';
