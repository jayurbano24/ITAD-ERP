-- Debug: Verificar clasificaciones en BOD-REM
SELECT 
  a.id,
  a.serial_number,
  a.internal_tag,
  w.code as warehouse,
  a.specifications,
  a.specifications->'workshop_classifications' as workshop_classifications,
  ti.classification_rec,
  ti.classification_f,
  ti.classification_c,
  wo.rec_classification
FROM assets a
LEFT JOIN warehouses w ON a.current_warehouse_id = w.id
LEFT JOIN ticket_items ti ON ti.asset_id = a.id
LEFT JOIN work_orders wo ON wo.asset_id = a.id
WHERE w.code = 'BOD-REM'
LIMIT 10;
