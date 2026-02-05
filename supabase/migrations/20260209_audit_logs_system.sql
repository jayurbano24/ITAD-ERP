-- =========================================================================
-- Sistema de Auditoría Completo
-- Registra automáticamente todas las acciones del sistema
-- Permite comentarios manuales de usuarios
-- Proporciona trazabilidad completa de Tickets, Lotes y Series
-- =========================================================================

-- Tipo ENUM para acciones del sistema
DROP TYPE IF EXISTS audit_action_type CASCADE;
CREATE TYPE audit_action_type AS ENUM (
  'CREATE',           -- Creación de registro
  'UPDATE',           -- Actualización de datos
  'DELETE',           -- Eliminación
  'STATUS_CHANGE',    -- Cambio de estado
  'ASSIGN',           -- Asignación a usuario/técnico
  'MOVE',             -- Movimiento de ubicación
  'TRANSFER',         -- Transferencia entre bodegas
  'LIQUIDATE',        -- Liquidación financiera
  'COMMENT',          -- Comentario manual de usuario
  'APPROVE',          -- Aprobación
  'REJECT',           -- Rechazo
  'DISPATCH',         -- Despacho
  'RECEIVE',          -- Recepción
  'CLASSIFY',         -- Clasificación
  'REPAIR',           -- Reparación
  'EXPORT'            -- Exportación de datos
);

-- Tipo ENUM para módulos del sistema
DROP TYPE IF EXISTS audit_module_type CASCADE;
CREATE TYPE audit_module_type AS ENUM (
  'TICKETS',          -- Módulo de tickets
  'LOGISTICS',        -- Módulo de logística
  'RECEPTION',        -- Módulo de recepción
  'WAREHOUSE',        -- Módulo de bodega
  'WORKSHOP',         -- Módulo de taller
  'SALES',            -- Módulo de ventas
  'FINANCE',          -- Módulo financiero
  'ADMIN',            -- Administración
  'CATALOG',          -- Catálogos maestros
  'REPORTS'           -- Reportes
);

-- Tipo ENUM para entidades rastreadas
DROP TYPE IF EXISTS audit_entity_type CASCADE;
CREATE TYPE audit_entity_type AS ENUM (
  'TICKET',           -- Ticket de operaciones
  'BATCH',            -- Lote
  'ASSET',            -- Activo/Serie
  'WORK_ORDER',       -- Orden de trabajo
  'SALE',             -- Venta
  'INVOICE',          -- Factura
  'PAYMENT',          -- Pago
  'USER',             -- Usuario
  'CLIENT'            -- Cliente
);

-- Tabla principal de auditoría
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Información de la acción
    action audit_action_type NOT NULL,
    module audit_module_type NOT NULL,
    description TEXT NOT NULL,
    
    -- Usuario que realizó la acción
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT,
    
    -- Entidad afectada (Ticket, Lote, Serie)
    entity_type audit_entity_type NOT NULL,
    entity_id UUID NOT NULL,
    entity_reference TEXT,  -- ID legible para humanos (TK-2026-00123, AUTO-123456, etc.)
    
    -- Entidades relacionadas (para trazabilidad cruzada)
    ticket_id UUID REFERENCES operations_tickets(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    
    -- Datos de auditoría
    data_before JSONB,      -- Estado anterior del registro
    data_after JSONB,       -- Estado nuevo del registro
    changes_summary JSONB,  -- Resumen de cambios específicos
    
    -- Metadatos
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índices para búsqueda rápida
    CONSTRAINT audit_logs_entity_check CHECK (
        (entity_type = 'TICKET' AND ticket_id IS NOT NULL) OR
        (entity_type = 'BATCH' AND batch_id IS NOT NULL) OR
        (entity_type = 'ASSET' AND asset_id IS NOT NULL) OR
        entity_type IN ('WORK_ORDER', 'SALE', 'INVOICE', 'PAYMENT', 'USER', 'CLIENT')
    )
);

-- Índices para optimizar consultas
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_ticket_id ON audit_logs(ticket_id);
CREATE INDEX idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX idx_audit_logs_asset_id ON audit_logs(asset_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_reference ON audit_logs(entity_reference);

-- Índice compuesto para consultas de trazabilidad
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_module_action ON audit_logs(module, action);

-- Índice GIN para búsqueda en JSONB
CREATE INDEX idx_audit_logs_data_before ON audit_logs USING GIN (data_before);
CREATE INDEX idx_audit_logs_data_after ON audit_logs USING GIN (data_after);
CREATE INDEX idx_audit_logs_changes_summary ON audit_logs USING GIN (changes_summary);

-- Comentarios de documentación
COMMENT ON TABLE audit_logs IS 'Registro completo de auditoría del sistema con trazabilidad de tickets, lotes y series';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción realizada (CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.module IS 'Módulo del sistema donde se realizó la acción';
COMMENT ON COLUMN audit_logs.description IS 'Descripción legible para humanos de la acción';
COMMENT ON COLUMN audit_logs.entity_type IS 'Tipo de entidad afectada (TICKET, BATCH, ASSET, etc.)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID UUID de la entidad afectada';
COMMENT ON COLUMN audit_logs.entity_reference IS 'Referencia legible de la entidad (TK-2026-00123, etc.)';
COMMENT ON COLUMN audit_logs.data_before IS 'Estado del registro antes de la modificación';
COMMENT ON COLUMN audit_logs.data_after IS 'Estado del registro después de la modificación';
COMMENT ON COLUMN audit_logs.changes_summary IS 'Resumen estructurado de los cambios realizados';

-- =========================================================================
-- FUNCIÓN HELPER: Registrar log de auditoría
-- =========================================================================
CREATE OR REPLACE FUNCTION log_audit_event(
    p_action audit_action_type,
    p_module audit_module_type,
    p_description TEXT,
    p_entity_type audit_entity_type,
    p_entity_id UUID,
    p_entity_reference TEXT DEFAULT NULL,
    p_ticket_id UUID DEFAULT NULL,
    p_batch_id UUID DEFAULT NULL,
    p_asset_id UUID DEFAULT NULL,
    p_data_before JSONB DEFAULT NULL,
    p_data_after JSONB DEFAULT NULL,
    p_changes_summary JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_user_name TEXT;
    v_user_email TEXT;
    v_user_role TEXT;
BEGIN
    -- Obtener datos del usuario si no se proporcionó user_id
    IF p_user_id IS NULL THEN
        BEGIN
            p_user_id := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            p_user_id := NULL;
        END;
    END IF;
    
    -- Obtener información del perfil del usuario desde profiles
    IF p_user_id IS NOT NULL THEN
        BEGIN
            SELECT 
                p.full_name,
                p.email,
                p.role::TEXT
            INTO v_user_name, v_user_email, v_user_role
            FROM profiles p
            WHERE p.id = p_user_id;
        EXCEPTION WHEN OTHERS THEN
            v_user_name := NULL;
            v_user_email := NULL;
            v_user_role := NULL;
        END;
    END IF;
    
    -- Insertar registro de auditoría
    INSERT INTO audit_logs (
        action,
        module,
        description,
        user_id,
        user_name,
        user_email,
        user_role,
        entity_type,
        entity_id,
        entity_reference,
        ticket_id,
        batch_id,
        asset_id,
        data_before,
        data_after,
        changes_summary
    ) VALUES (
        p_action,
        p_module,
        p_description,
        p_user_id,
        v_user_name,
        v_user_email,
        v_user_role,
        p_entity_type,
        p_entity_id,
        p_entity_reference,
        p_ticket_id,
        p_batch_id,
        p_asset_id,
        p_data_before,
        p_data_after,
        p_changes_summary
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- =========================================================================
-- TRIGGERS AUTOMÁTICOS PARA TICKETS
-- =========================================================================

-- Trigger para CREATE en operations_tickets
CREATE OR REPLACE FUNCTION trigger_audit_ticket_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM log_audit_event(
        'CREATE'::audit_action_type,
        'TICKETS'::audit_module_type,
        format('Ticket creado: %s - %s', NEW.readable_id, NEW.title),
        'TICKET'::audit_entity_type,
        NEW.id,
        NEW.readable_id,
        NEW.id,
        NULL,
        NULL,
        NULL,
        to_jsonb(NEW),
        jsonb_build_object(
            'ticket_type', NEW.ticket_type,
            'client_id', NEW.client_id,
            'status', NEW.status,
            'expected_units', NEW.expected_units
        ),
        NEW.created_by
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_ticket_create_trigger
AFTER INSERT ON operations_tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_ticket_create();

-- Trigger para UPDATE en operations_tickets
CREATE OR REPLACE FUNCTION trigger_audit_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_description TEXT;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Detectar cambios específicos
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_description := format('Estado cambiado de %s a %s', OLD.status, NEW.status);
    END IF;
    
    IF OLD.received_units IS DISTINCT FROM NEW.received_units THEN
        v_changes := v_changes || jsonb_build_object('received_units', jsonb_build_object('old', OLD.received_units, 'new', NEW.received_units));
    END IF;
    
    IF OLD.title IS DISTINCT FROM NEW.title THEN
        v_changes := v_changes || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    
    -- Solo registrar si hubo cambios
    IF v_changes != '{}'::jsonb THEN
        IF v_description IS NULL THEN
            v_description := format('Ticket actualizado: %s', NEW.readable_id);
        END IF;
        
        PERFORM log_audit_event(
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'STATUS_CHANGE'::audit_action_type
                ELSE 'UPDATE'::audit_action_type
            END,
            'TICKETS'::audit_module_type,
            v_description,
            'TICKET'::audit_entity_type,
            NEW.id,
            NEW.readable_id,
            NEW.id,
            NULL,
            NULL,
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_changes,
            v_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_ticket_update_trigger
AFTER UPDATE ON operations_tickets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_ticket_update();

-- =========================================================================
-- TRIGGERS AUTOMÁTICOS PARA BATCHES (LOTES)
-- =========================================================================

CREATE OR REPLACE FUNCTION trigger_audit_batch_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_ref TEXT;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Obtener readable_id del ticket
    SELECT readable_id INTO v_ticket_ref
    FROM operations_tickets
    WHERE id = NEW.ticket_id;
    
    PERFORM log_audit_event(
        'CREATE'::audit_action_type,
        'LOGISTICS'::audit_module_type,
        format('Lote creado: %s para ticket %s', NEW.internal_batch_id, v_ticket_ref),
        'BATCH'::audit_entity_type,
        NEW.id,
        NEW.internal_batch_id,
        NEW.ticket_id,
        NEW.id,
        NULL,
        NULL,
        to_jsonb(NEW),
        jsonb_build_object(
            'ticket_id', NEW.ticket_id,
            'status', NEW.status,
            'expected_units', NEW.expected_units,
            'location', NEW.location
        ),
        v_user_id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_batch_create_trigger
AFTER INSERT ON batches
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_batch_create();

CREATE OR REPLACE FUNCTION trigger_audit_batch_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_description TEXT;
    v_ticket_ref TEXT;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    SELECT readable_id INTO v_ticket_ref FROM operations_tickets WHERE id = NEW.ticket_id;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_description := format('Lote %s: Estado cambiado de %s a %s', NEW.internal_batch_id, OLD.status, NEW.status);
    END IF;
    
    IF OLD.location IS DISTINCT FROM NEW.location THEN
        v_changes := v_changes || jsonb_build_object('location', jsonb_build_object('old', OLD.location, 'new', NEW.location));
        v_description := format('Lote %s: Ubicación actualizada', NEW.internal_batch_id);
    END IF;
    
    IF OLD.received_units IS DISTINCT FROM NEW.received_units THEN
        v_changes := v_changes || jsonb_build_object('received_units', jsonb_build_object('old', OLD.received_units, 'new', NEW.received_units));
    END IF;
    
    IF v_changes != '{}'::jsonb THEN
        IF v_description IS NULL THEN
            v_description := format('Lote actualizado: %s', NEW.internal_batch_id);
        END IF;
        
        PERFORM log_audit_event(
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'STATUS_CHANGE'::audit_action_type
                WHEN OLD.location IS DISTINCT FROM NEW.location THEN 'MOVE'::audit_action_type
                ELSE 'UPDATE'::audit_action_type
            END,
            'LOGISTICS'::audit_module_type,
            v_description,
            'BATCH'::audit_entity_type,
            NEW.id,
            NEW.internal_batch_id,
            NEW.ticket_id,
            NEW.id,
            NULL,
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_changes,
            v_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_batch_update_trigger
AFTER UPDATE ON batches
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_batch_update();

-- =========================================================================
-- TRIGGERS AUTOMÁTICOS PARA ASSETS (SERIES)
-- =========================================================================

CREATE OR REPLACE FUNCTION trigger_audit_asset_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_ref TEXT;
    v_ticket_id UUID;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Obtener referencia del lote y ticket
    SELECT internal_batch_id, ticket_id 
    INTO v_batch_ref, v_ticket_id
    FROM batches
    WHERE id = NEW.batch_id;
    
    PERFORM log_audit_event(
        'CREATE'::audit_action_type,
        'RECEPTION'::audit_module_type,
        format('Activo creado: %s %s %s S/N: %s', 
            COALESCE(NEW.manufacturer, ''),
            COALESCE(NEW.model, ''),
            COALESCE(NEW.asset_type, ''),
            COALESCE(NEW.serial_number, 'SIN-SERIE')
        ),
        'ASSET'::audit_entity_type,
        NEW.id,
        NEW.serial_number,
        v_ticket_id,
        NEW.batch_id,
        NEW.id,
        NULL,
        to_jsonb(NEW),
        jsonb_build_object(
            'serial_number', NEW.serial_number,
            'manufacturer', NEW.manufacturer,
            'model', NEW.model,
            'asset_type', NEW.asset_type,
            'status', NEW.status
        ),
        v_user_id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_asset_create_trigger
AFTER INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_create();

CREATE OR REPLACE FUNCTION trigger_audit_asset_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_description TEXT;
    v_ticket_id UUID;
    v_user_id UUID;
BEGIN
    -- Intentar obtener user_id
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    SELECT ticket_id INTO v_ticket_id FROM batches WHERE id = NEW.batch_id;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        v_description := format('Activo %s: Estado %s → %s', NEW.serial_number, OLD.status, NEW.status);
    END IF;
    
    IF OLD.warehouse_location IS DISTINCT FROM NEW.warehouse_location THEN
        v_changes := v_changes || jsonb_build_object('warehouse_location', jsonb_build_object('old', OLD.warehouse_location, 'new', OLD.warehouse_location));
        v_description := format('Activo %s: Ubicación actualizada', NEW.serial_number);
    END IF;
    
    IF OLD.sales_price IS DISTINCT FROM NEW.sales_price THEN
        v_changes := v_changes || jsonb_build_object('sales_price', jsonb_build_object('old', OLD.sales_price, 'new', NEW.sales_price));
        v_description := format('Activo %s: Precio actualizado', NEW.serial_number);
    END IF;
    
    IF v_changes != '{}'::jsonb THEN
        IF v_description IS NULL THEN
            v_description := format('Activo actualizado: %s', NEW.serial_number);
        END IF;
        
        PERFORM log_audit_event(
            CASE 
                WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'STATUS_CHANGE'::audit_action_type
                WHEN OLD.warehouse_location IS DISTINCT FROM NEW.warehouse_location THEN 'MOVE'::audit_action_type
                ELSE 'UPDATE'::audit_action_type
            END,
            'WAREHOUSE'::audit_module_type,
            v_description,
            'ASSET'::audit_entity_type,
            NEW.id,
            NEW.serial_number,
            v_ticket_id,
            NEW.batch_id,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_changes,
            v_user_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_asset_update_trigger
AFTER UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_asset_update();

-- =========================================================================
-- POLÍTICAS RLS (Row Level Security)
-- =========================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Administradores pueden ver todo
CREATE POLICY audit_logs_admin_all ON audit_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::TEXT IN ('admin', 'superadmin')
        )
    );

-- Supervisores pueden ver logs de su módulo
CREATE POLICY audit_logs_supervisor_view ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::TEXT = 'supervisor'
        )
    );

-- Usuarios operativos solo pueden ver sus propios logs
CREATE POLICY audit_logs_user_own ON audit_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Permitir INSERT desde triggers del sistema
CREATE POLICY audit_logs_system_insert ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

COMMENT ON TABLE audit_logs IS 'Sistema completo de auditoría con triggers automáticos y trazabilidad de tickets, lotes y series';
