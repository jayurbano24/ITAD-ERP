-- Fix: Assign the item with box_number=0 in TK-2026-00007 to box_number=10007
UPDATE ticket_items ti
SET box_number = 10007
WHERE ticket_id = (SELECT id FROM operations_tickets WHERE readable_id = 'TK-2026-00007')
  AND box_number = 0;

-- Verify the fix
SELECT 
  t.readable_id,
  ti.box_number,
  COUNT(*) as count
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE t.readable_id IN ('TK-2026-00005', 'TK-2026-00007')
GROUP BY t.readable_id, ti.box_number
ORDER BY t.readable_id, ti.box_number;
