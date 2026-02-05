-- Find ALL occurrences of box_number = 10006 across ALL tickets
SELECT 
  t.id,
  t.readable_id,
  COUNT(*) as total_items_in_caja_10006,
  STRING_AGG(ti.id::text, ', ') as item_ids
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number = 10006
GROUP BY t.id, t.readable_id
ORDER BY t.readable_id;

-- Count total items with box_number = 10006 across all tickets
SELECT COUNT(*) as total_caja_10006_items
FROM ticket_items
WHERE box_number = 10006;

-- Show which tickets have items in box_number = 10006
SELECT 
  t.readable_id,
  t.client:crm_entities->>'commercial_name' as client,
  COUNT(*) as items_in_10006
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number = 10006
GROUP BY t.readable_id, t.id
ORDER BY t.readable_id;

-- Check for items without a box_number assigned (should be empty)
SELECT 
  t.readable_id,
  COUNT(*) as unassigned_items
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number IS NULL OR ti.box_number = 0
GROUP BY t.readable_id
ORDER BY unassigned_items DESC;
