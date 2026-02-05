-- Script para actualizar todos los ticket_items con status PENDIENTE a COMPLETADO
UPDATE ticket_items
SET status = 'COMPLETADO'
WHERE status = 'PENDIENTE';

-- Verificar resultados
SELECT 
  status,
  COUNT(*) as total
FROM ticket_items
GROUP BY status;
