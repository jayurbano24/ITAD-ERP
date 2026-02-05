-- Diagnóstico: Verificar el estado de la caja #10006 en el ticket TK-2026-00006
-- Este script ayuda a identificar por qué la caja no se visualiza en el módulo de Recepción

SELECT 
  ot.readable_id as ticket_id,
  ot.id as ticket_uuid,
  ot.status as ticket_status,
  ot.received_units,
  ot.expected_units,
  COUNT(ti.id) as total_items,
  COUNT(DISTINCT ti.box_number) as distinct_boxes,
  STRING_AGG(DISTINCT ti.box_number::text, ', ') as box_numbers,
  COUNT(CASE WHEN ti.validation_status = 'PENDIENTE_VALIDACION' THEN 1 END) as pending_items,
  COUNT(CASE WHEN ti.classification_f IS NOT NULL THEN 1 END) as classified_items
FROM operations_tickets ot
LEFT JOIN ticket_items ti ON ot.id = ti.ticket_id
WHERE ot.readable_id ILIKE 'TK-2026-00006'
GROUP BY ot.id, ot.readable_id, ot.status, ot.received_units, ot.expected_units;

-- Detalles específicos de items en las cajas
SELECT 
  ti.id,
  ti.box_number,
  ti.box_sku,
  ti.box_seal,
  ti.box_reception_code,
  ti.brand,
  ti.model,
  ti.collected_serial,
  ti.validation_status,
  ti.classification_f,
  ti.classification_c,
  ti.created_at
FROM ticket_items ti
INNER JOIN operations_tickets ot ON ti.ticket_id = ot.id
WHERE ot.readable_id ILIKE 'TK-2026-00006'
ORDER BY ti.box_number, ti.created_at;
