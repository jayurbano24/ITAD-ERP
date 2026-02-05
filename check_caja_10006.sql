-- Check where Caja 10006 appears across tickets
SELECT 
  t.readable_id as ticket_id,
  COUNT(DISTINCT ti.id) as total_items_in_ticket,
  COUNT(DISTINCT CASE WHEN ti.box_number = 10006 THEN ti.id END) as items_in_caja_10006,
  STRING_AGG(DISTINCT ti.ticket_id::text, ', ') as unique_ticket_ids
FROM ticket_items ti
LEFT JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number = 10006 OR ti.box_number IS NULL
GROUP BY t.readable_id, t.id
ORDER BY t.readable_id;

-- Check if box_number is NULL or 0 across tickets
SELECT 
  t.readable_id,
  COUNT(*) as items_without_box_number
FROM ticket_items ti
LEFT JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number IS NULL OR ti.box_number = 0
GROUP BY t.readable_id
ORDER BY items_without_box_number DESC;

-- Show detailed info about items in specific tickets
SELECT 
  t.readable_id,
  ti.box_number,
  COUNT(*) as count
FROM ticket_items ti
LEFT JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE t.readable_id IN ('TK-2026-00005', 'TK-2026-00007')
GROUP BY t.readable_id, ti.box_number
ORDER BY t.readable_id, ti.box_number;
