-- =========================================================================
-- Migración: Habilitar cascada de borrado para ticket_reception_log
-- y crear función para borrar tickets completamente con toda su logística
-- =========================================================================

-- 1. Recrear ticket_reception_log con ON DELETE CASCADE
ALTER TABLE public.ticket_reception_log DROP CONSTRAINT IF EXISTS ticket_reception_log_ticket_id_fkey;

ALTER TABLE public.ticket_reception_log
ADD CONSTRAINT ticket_reception_log_ticket_id_fkey 
  FOREIGN KEY (ticket_id) REFERENCES public.operations_tickets(id) ON DELETE CASCADE;

-- 2. Función que borra un ticket y toda su logística asociada
CREATE OR REPLACE FUNCTION public.delete_ticket_completely(
  p_ticket_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deleted_items INTEGER,
  deleted_history BOOLEAN,
  deleted_reception_logs INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_items INTEGER := 0;
  v_deleted_history BOOLEAN := FALSE;
  v_deleted_reception_logs INTEGER := 0;
  v_exists BOOLEAN := FALSE;
BEGIN
  -- 1. Verificar que el ticket existe
  SELECT EXISTS(SELECT 1 FROM public.operations_tickets WHERE id = p_ticket_id)
  INTO v_exists;
  
  IF NOT v_exists THEN
    RETURN QUERY SELECT FALSE, 'Ticket no encontrado'::TEXT, 0::INTEGER, FALSE, 0::INTEGER;
    RETURN;
  END IF;

  -- 2. Contar y eliminar items del ticket
  SELECT COUNT(*) INTO v_deleted_items
  FROM public.ticket_items
  WHERE ticket_id = p_ticket_id;
  
  DELETE FROM public.ticket_items
  WHERE ticket_id = p_ticket_id;

  -- 3. Contar y eliminar historial del ticket
  SELECT COUNT(*) > 0 INTO v_deleted_history
  FROM public.operations_ticket_history
  WHERE ticket_id = p_ticket_id;
  
  DELETE FROM public.operations_ticket_history
  WHERE ticket_id = p_ticket_id;

  -- 4. Contar y eliminar logs de recepción (se eliminarán en cascada de todas formas)
  SELECT COUNT(*) INTO v_deleted_reception_logs
  FROM public.ticket_reception_log
  WHERE ticket_id = p_ticket_id;
  
  DELETE FROM public.ticket_reception_log
  WHERE ticket_id = p_ticket_id;

  -- 5. Eliminar el ticket en sí
  DELETE FROM public.operations_tickets
  WHERE id = p_ticket_id;

  -- Retornar resultados
  RETURN QUERY SELECT 
    TRUE,
    'Ticket y toda su logística eliminados correctamente'::TEXT,
    v_deleted_items,
    v_deleted_history,
    v_deleted_reception_logs;
END;
$$;

-- 3. Grants para la función
GRANT EXECUTE ON FUNCTION public.delete_ticket_completely(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.delete_ticket_completely(UUID) IS 
  'Elimina un ticket completamente junto con: items, historial, y logs de recepción. Usa RPC: SELECT delete_ticket_completely(ticket_id::uuid)';
