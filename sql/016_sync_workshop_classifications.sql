-- Sincronizar clasificaciones de ticket_items a assets.specifications.workshop_classifications
-- para todos los activos que aún no tengan workshop_classifications con datos válidos

-- Para activos que tienen asset_id en ticket_items
UPDATE assets a
SET
  specifications = CASE
    WHEN a.specifications IS NULL THEN jsonb_build_object(
      'workshop_classifications', jsonb_build_object(
        'rec', ti.classification_rec,
        'f', ti.classification_f,
        'c', ti.classification_c
      )
    )
    ELSE jsonb_set(
      a.specifications,
      '{workshop_classifications}',
      jsonb_build_object(
        'rec', ti.classification_rec,
        'f', ti.classification_f,
        'c', ti.classification_c
      )
    )
  END,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (ti.asset_id) 
    ti.asset_id,
    ti.classification_rec,
    ti.classification_f,
    ti.classification_c
  FROM ticket_items ti
  WHERE ti.asset_id IS NOT NULL
    AND (ti.classification_rec IS NOT NULL 
         OR ti.classification_f IS NOT NULL 
         OR ti.classification_c IS NOT NULL)
  ORDER BY ti.asset_id, ti.created_at DESC
) ti
WHERE a.id = ti.asset_id
  AND (
    a.specifications IS NULL
    OR a.specifications->'workshop_classifications' IS NULL
    OR (a.specifications->'workshop_classifications'->>'rec' IS NULL 
        AND ti.classification_rec IS NOT NULL)
    OR (a.specifications->'workshop_classifications'->>'f' IS NULL 
        AND ti.classification_f IS NOT NULL)
    OR (a.specifications->'workshop_classifications'->>'c' IS NULL 
        AND ti.classification_c IS NOT NULL)
  );


