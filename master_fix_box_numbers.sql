-- MASTER FIX: Remove all items with box_number=10006 and reassign them correctly

-- 1. First, check what we have
SELECT 
  t.readable_id,
  COUNT(*) as items_with_10006
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number = 10006
GROUP BY t.readable_id
ORDER BY t.readable_id;

-- 2. Get the mapping of which ticket should have which box_number
-- Extract the ticket number from readable_id and use it for box_number
SELECT 
  t.readable_id,
  CAST(REGEXP_SUBSTR(t.readable_id, '[0-9]+$') AS INTEGER) as correct_box_number,
  COUNT(*) as items_to_fix
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number = 10006
GROUP BY t.readable_id, t.id
ORDER BY t.readable_id;

-- 3. Fix the data: Update all box_number=10006 to the correct box_number based on ticket
-- For TK-2026-00001 -> box 10001, TK-2026-00002 -> box 10002, etc.
UPDATE ticket_items ti
SET box_number = CAST(REGEXP_SUBSTR(t.readable_id, '[0-9]+$') AS INTEGER)
FROM operations_tickets t
WHERE ti.ticket_id = t.id
  AND ti.box_number = 10006;

-- 4. Also fix any items with box_number=0 (unassigned)
UPDATE ticket_items ti
SET box_number = CAST(REGEXP_SUBSTR(t.readable_id, '[0-9]+$') AS INTEGER)
FROM operations_tickets t
WHERE ti.ticket_id = t.id
  AND (ti.box_number = 0 OR ti.box_number IS NULL);

-- 5. Verify the fix
SELECT 
  t.readable_id,
  ti.box_number,
  COUNT(*) as count
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE t.readable_id IN ('TK-2026-00001', 'TK-2026-00002', 'TK-2026-00003', 'TK-2026-00004', 'TK-2026-00005', 'TK-2026-00007')
GROUP BY t.readable_id, ti.box_number
ORDER BY t.readable_id, ti.box_number;

-- 6. Check for any remaining invalid box_numbers (0 or NULL)
SELECT 
  t.readable_id,
  COUNT(*) as invalid_items
FROM ticket_items ti
JOIN operations_tickets t ON ti.ticket_id = t.id
WHERE ti.box_number IS NULL OR ti.box_number = 0
GROUP BY t.readable_id
ORDER BY t.readable_id;
