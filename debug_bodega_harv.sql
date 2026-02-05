-- Check BOD-HARV warehouse exists and is active
SELECT id, code, name, is_active, description FROM public.warehouses 
WHERE code = 'BOD-HARV';

-- Count assets in BOD-HARV warehouse
SELECT 
  w.code,
  w.name,
  COUNT(a.id) as asset_count
FROM public.warehouses w
LEFT JOIN public.assets a ON a.current_warehouse_id = w.id
WHERE w.code = 'BOD-HARV'
GROUP BY w.id, w.code, w.name;

-- List all assets in BOD-HARV with their details
SELECT 
  a.id,
  a.serial_number,
  a.internal_tag,
  a.manufacturer,
  a.model,
  a.current_warehouse_id,
  w.code as warehouse_code,
  w.name as warehouse_name,
  a.updated_at
FROM public.assets a
LEFT JOIN public.warehouses w ON a.current_warehouse_id = w.id
WHERE a.current_warehouse_id IN (SELECT id FROM public.warehouses WHERE code = 'BOD-HARV')
ORDER BY a.updated_at DESC;

-- Check warehouse names for all bodegas
SELECT id, code, name, is_active FROM public.warehouses 
WHERE code LIKE 'BOD-%'
ORDER BY code;
