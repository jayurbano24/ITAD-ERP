-- Debug: Verificar estructura actual de datos en BOD-REM
SELECT 
  a.id,
  a.serial_number,
  a.internal_tag,
  w.code as warehouse,
  a.specifications->'workshop_classifications' as workshop_classifications,
  a.specifications->>'rec_classification_out' as rec_out,
  a.specifications->>'f_classification_out' as f_out,
  a.specifications->>'c_classification_out' as c_out,
  (SELECT classification_rec FROM ticket_items WHERE asset_id = a.id LIMIT 1) as ticket_rec,
  (SELECT classification_f FROM ticket_items WHERE asset_id = a.id LIMIT 1) as ticket_f,
  (SELECT classification_c FROM ticket_items WHERE asset_id = a.id LIMIT 1) as ticket_c,
  (SELECT rec_classification FROM work_orders WHERE asset_id = a.id LIMIT 1) as work_order_rec
FROM assets a
LEFT JOIN warehouses w ON a.current_warehouse_id = w.id
WHERE w.code = 'BOD-REM'
LIMIT 5;
