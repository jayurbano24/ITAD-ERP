-- =========================================================================
-- Migración: Sincronizar datos de clasificación de ticket_items a assets
-- Esta migración actualiza los assets existentes con los datos de 
-- clasificación que fueron capturados en ticket_items
-- =========================================================================

-- Actualizar assets con datos de ticket_items donde exista relación por asset_id
UPDATE assets a
SET
  color = COALESCE(a.color, ti.color_detail, ti.color),
  specifications = jsonb_strip_nulls(
    COALESCE(a.specifications, '{}'::jsonb) || jsonb_build_object(
      'workshop_classifications', jsonb_strip_nulls(jsonb_build_object(
        'rec', ti.classification_rec,
        'f', ti.classification_f,
        'c', ti.classification_c
      )),
      'hardware_specs', jsonb_strip_nulls(jsonb_build_object(
        'processor', ti.processor,
        'bios_version', ti.bios_version,
        'ram_capacity', ti.ram_capacity,
        'ram_type', ti.ram_type,
        'disk_capacity', ti.disk_capacity,
        'disk_type', ti.disk_type,
        'keyboard_type', ti.keyboard_type,
        'keyboard_version', ti.keyboard_version
      )),
      'reception_notes', ti.observations
    )
  ),
  updated_at = NOW()
FROM ticket_items ti
WHERE ti.asset_id = a.id
  AND (
    ti.classification_rec IS NOT NULL
    OR ti.classification_f IS NOT NULL
    OR ti.classification_c IS NOT NULL
    OR ti.processor IS NOT NULL
    OR ti.ram_capacity IS NOT NULL
    OR ti.disk_capacity IS NOT NULL
    OR ti.keyboard_type IS NOT NULL
    OR ti.color_detail IS NOT NULL
  );

-- También actualizar assets que NO tienen asset_id pero tienen el mismo serial_number
UPDATE assets a
SET
  color = COALESCE(a.color, ti.color_detail, ti.color),
  specifications = jsonb_strip_nulls(
    COALESCE(a.specifications, '{}'::jsonb) || jsonb_build_object(
      'workshop_classifications', jsonb_strip_nulls(jsonb_build_object(
        'rec', ti.classification_rec,
        'f', ti.classification_f,
        'c', ti.classification_c
      )),
      'hardware_specs', jsonb_strip_nulls(jsonb_build_object(
        'processor', ti.processor,
        'bios_version', ti.bios_version,
        'ram_capacity', ti.ram_capacity,
        'ram_type', ti.ram_type,
        'disk_capacity', ti.disk_capacity,
        'disk_type', ti.disk_type,
        'keyboard_type', ti.keyboard_type,
        'keyboard_version', ti.keyboard_version
      )),
      'reception_notes', ti.observations
    )
  ),
  updated_at = NOW()
FROM ticket_items ti
WHERE ti.collected_serial = a.serial_number
  AND ti.asset_id IS NULL
  AND (
    ti.classification_rec IS NOT NULL
    OR ti.classification_f IS NOT NULL
    OR ti.classification_c IS NOT NULL
    OR ti.processor IS NOT NULL
    OR ti.ram_capacity IS NOT NULL
    OR ti.disk_capacity IS NOT NULL
    OR ti.keyboard_type IS NOT NULL
    OR ti.color_detail IS NOT NULL
  );

-- Actualizar el asset_id en ticket_items donde no está establecido pero el serial coincide
UPDATE ticket_items ti
SET asset_id = a.id
FROM assets a
WHERE ti.collected_serial = a.serial_number
  AND ti.asset_id IS NULL;

