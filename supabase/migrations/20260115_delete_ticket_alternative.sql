-- =========================================================================
-- Migración alternativa: Usar trigger para cascada en lugar de RPC
-- Si delete_ticket_completely() no existe o no funciona, usar DELETE directo
-- =========================================================================

-- Si la tabla ticket_reception_log no tiene cascada, agregarla
ALTER TABLE public.ticket_reception_log DROP CONSTRAINT IF EXISTS ticket_reception_log_ticket_id_fkey;

ALTER TABLE public.ticket_reception_log
ADD CONSTRAINT ticket_reception_log_ticket_id_fkey 
  FOREIGN KEY (ticket_id) REFERENCES public.operations_tickets(id) ON DELETE CASCADE;

-- Función simplificada que simplemente retorna true (para compatibilidad)
-- Supabase ejecutará los DELETEs en cascada automáticamente
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
LANGUAGE sql
AS $$
  DELETE FROM public.operations_tickets 
  WHERE id = p_ticket_id;
  
  SELECT 
    TRUE::BOOLEAN,
    'Ticket eliminado'::TEXT,
    0::INTEGER,
    FALSE::BOOLEAN,
    0::INTEGER;
$$;

GRANT EXECUTE ON FUNCTION public.delete_ticket_completely(UUID) TO authenticated, service_role;
