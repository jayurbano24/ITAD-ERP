-- =========================================================================
-- FUNCIÓN RPC PARA INSERTAR DATOS DE PRUEBA EN AUDITORÍA
-- =========================================================================

DROP FUNCTION IF EXISTS insert_audit_test_data() CASCADE;

CREATE OR REPLACE FUNCTION insert_audit_test_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Insertar registros de prueba SIN foreign keys (solo para demostración)
  INSERT INTO audit_logs (
    action, module, description, entity_type, entity_id, entity_reference,
    user_name, user_email, user_role,
    data_after, changes_summary, created_at
  ) VALUES
  (
    'CREATE'::audit_action_type,
    'TICKETS'::audit_module_type,
    'Ticket creado: TK-2026-00001 - Laptop HP',
    'TICKET'::audit_entity_type,
    '550e8400-e29b-41d4-a716-446655440001',
    'TK-2026-00001',
    'Admin User',
    'admin@example.com',
    'admin',
    '{"ticket_type": "repair", "status": "pending"}'::jsonb,
    '{"status": "pending"}'::jsonb,
    NOW() - INTERVAL '4 hours'
  ),
  (
    'CREATE'::audit_action_type,
    'LOGISTICS'::audit_module_type,
    'Lote creado: AUTO-001 para ticket TK-2026-00001',
    'BATCH'::audit_entity_type,
    '550e8400-e29b-41d4-a716-446655440002',
    'AUTO-001',
    'Admin User',
    'admin@example.com',
    'admin',
    '{"status": "active", "location": "warehouse-a"}'::jsonb,
    '{"status": "active"}'::jsonb,
    NOW() - INTERVAL '3 hours'
  ),
  (
    'CREATE'::audit_action_type,
    'RECEPTION'::audit_module_type,
    'Activo creado: HP Pavilion 15 S/N: 7B9B7987987',
    'ASSET'::audit_entity_type,
    '550e8400-e29b-41d4-a716-446655440003',
    '7B9B7987987',
    'Admin User',
    'admin@example.com',
    'admin',
    '{"serial_number": "7B9B7987987", "status": "received"}'::jsonb,
    '{"status": "received"}'::jsonb,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'STATUS_CHANGE'::audit_action_type,
    'RECEPTION'::audit_module_type,
    'Activo 7B9B7987987: Estado recibido → evaluating',
    'ASSET'::audit_entity_type,
    '550e8400-e29b-41d4-a716-446655440003',
    '7B9B7987987',
    'Technician User',
    'tech@example.com',
    'technician',
    '{"status": "evaluating"}'::jsonb,
    '{"status": {"old": "received", "new": "evaluating"}}'::jsonb,
    NOW() - INTERVAL '1 hour'
  ),
  (
    'MOVE'::audit_action_type,
    'LOGISTICS'::audit_module_type,
    'Lote AUTO-001: Ubicación actualizada',
    'BATCH'::audit_entity_type,
    '550e8400-e29b-41d4-a716-446655440002',
    'AUTO-001',
    'Warehouse User',
    'warehouse@example.com',
    'warehouse_manager',
    '{"location": "workshop-b"}'::jsonb,
    '{"location": {"old": "warehouse-a", "new": "workshop-b"}}'::jsonb,
    NOW() - INTERVAL '30 minutes'
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN json_build_object('success', true, 'message', 'Datos de prueba insertados exitosamente', 'count', v_count);
END;
$$;

-- Comentario de documentación
COMMENT ON FUNCTION insert_audit_test_data() IS 'Inserta registros de prueba en la tabla de auditoría. Útil para demostración y testing.';
