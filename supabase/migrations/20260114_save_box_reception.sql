-- =========================================================================
-- Migración: Función transaccional save_box_reception
-- =========================================================================

ALTER TABLE ticket_items
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id);

CREATE TABLE IF NOT EXISTS ticket_reception_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES operations_tickets(id),
  box_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, box_number)
);

CREATE OR REPLACE FUNCTION public.save_box_reception(
  p_ticket_id UUID,
  p_box_number INTEGER,
  p_warehouse_code TEXT,
  p_item_type TEXT DEFAULT 'asset'
)
RETURNS TABLE (
  reception_code CHAR(4),
  moved_assets INTEGER,
  warehouse_code TEXT
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_warehouse_id UUID;
  v_batch_id UUID;
  v_code CHAR(4);
  v_item RECORD;
  v_asset_id UUID;
  v_ticket_reference TEXT;
  v_counter INTEGER := 0;
  v_inventory_item_type TEXT := 'asset';
  v_spec JSONB;
BEGIN
  SELECT readable_id INTO v_ticket_reference
  FROM operations_tickets
  WHERE id = p_ticket_id
  LIMIT 1;

  IF v_ticket_reference IS NULL THEN
    RAISE EXCEPTION 'Ticket no encontrado';
  END IF;

  SELECT id INTO v_warehouse_id
  FROM warehouses
  WHERE code = p_warehouse_code OR name = p_warehouse_code
  LIMIT 1;

  IF v_warehouse_id IS NULL THEN
    RAISE EXCEPTION 'Bodega de recepción % no está configurada', p_warehouse_code;
  END IF;

  SELECT id INTO v_batch_id
  FROM batches
  WHERE ticket_id = p_ticket_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'No existe lote asociado al ticket';
  END IF;

  v_inventory_item_type := lower(COALESCE(NULLIF(trim(p_item_type), ''), v_inventory_item_type));

  IF v_inventory_item_type NOT IN ('asset', 'part', 'seedstock') THEN
    RAISE EXCEPTION 'Tipo de ítem % no está permitido', p_item_type;
  END IF;

  INSERT INTO ticket_reception_log (ticket_id, box_number)
  VALUES (p_ticket_id, p_box_number)
  ON CONFLICT (ticket_id, box_number) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM ticket_items
    WHERE ticket_id = p_ticket_id
      AND box_number = p_box_number
  ) THEN
    RAISE EXCEPTION 'No se encontraron items para la caja %', p_box_number;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ticket_items
    WHERE ticket_id = p_ticket_id
      AND box_number = p_box_number
      AND collected_serial IS NOT NULL
      AND (product_type IS NULL OR trim(product_type) = '')
  ) THEN
    RAISE EXCEPTION 'Falta el Tipo de Activo en algunos ítems antes de crear los activos';
  END IF;

  SELECT box_reception_code INTO v_code
  FROM ticket_items
  WHERE ticket_id = p_ticket_id
    AND box_number = p_box_number
    AND box_reception_code IS NOT NULL
  LIMIT 1;

  IF v_code IS NULL THEN
    LOOP
      v_code := lpad((floor(random() * 9000 + 1000))::text, 4, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM ticket_items
        WHERE ticket_id = p_ticket_id
          AND box_number = p_box_number
          AND box_reception_code = v_code
      );
    END LOOP;

    UPDATE ticket_items
    SET box_reception_code = v_code
    WHERE ticket_id = p_ticket_id
      AND box_number = p_box_number;
  END IF;

  FOR v_item IN
    SELECT
      id,
      collected_serial,
      product_type,
      brand_full,
      model_full,
      color_detail,
      classification_rec,
      classification_f,
      classification_c,
      processor,
      bios_version,
      observations,
      ram_capacity,
      ram_type,
      disk_capacity,
      disk_type,
      keyboard_type,
      keyboard_version
    FROM ticket_items
    WHERE ticket_id = p_ticket_id
      AND box_number = p_box_number
      AND collected_serial IS NOT NULL
  LOOP
    v_spec := jsonb_strip_nulls(
      jsonb_build_object(
        'workshop_classifications',
        jsonb_strip_nulls(
          jsonb_build_object(
            'rec', v_item.classification_rec,
            'f', v_item.classification_f,
            'c', v_item.classification_c
          )
        ),
        'hardware_specs',
        jsonb_strip_nulls(
          jsonb_build_object(
            'processor', v_item.processor,
            'bios_version', v_item.bios_version,
            'ram_capacity', v_item.ram_capacity,
            'ram_type', v_item.ram_type,
            'disk_capacity', v_item.disk_capacity,
            'disk_type', v_item.disk_type,
            'keyboard_type', v_item.keyboard_type,
            'keyboard_version', v_item.keyboard_version
          )
        ),
        'reception_notes', v_item.observations
      )
    );
    SELECT id INTO v_asset_id
    FROM assets
    WHERE serial_number = v_item.collected_serial
    LIMIT 1;

    IF v_asset_id IS NULL THEN
      INSERT INTO assets (
        serial_number,
        batch_id,
        asset_type,
        status,
        current_warehouse_id,
        currency,
        cost_amount,
        manufacturer,
        model,
        color,
        specifications,
        created_at,
        updated_at
      )
      VALUES (
        v_item.collected_serial,
        v_batch_id,
        v_item.product_type,
        'received',
        v_warehouse_id,
        'GTQ',
        0,
        v_item.brand_full,
        v_item.model_full,
        v_item.color_detail,
        CASE
          WHEN v_spec IS NULL OR v_spec = '{}'::jsonb THEN NULL
          ELSE v_spec
        END,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_asset_id;
    ELSE
      UPDATE assets
      SET
        batch_id = v_batch_id,
        manufacturer = COALESCE(v_item.brand_full, manufacturer),
        model = COALESCE(v_item.model_full, model),
        color = COALESCE(v_item.color_detail, color),
        specifications = CASE
          WHEN v_spec IS NULL OR v_spec = '{}'::jsonb THEN specifications
          ELSE COALESCE(specifications, '{}'::jsonb) || v_spec
        END,
        updated_at = NOW()
      WHERE id = v_asset_id;
    END IF;

    UPDATE ticket_items
    SET asset_id = v_asset_id
    WHERE id = v_item.id;

    -- Registrar el movimiento obligando a mapear cada columna NOT NULL del esquema
    INSERT INTO inventory_movements (
      asset_id,
      batch_id,
      item_type,
      item_id,
      item_sku,
      quantity,
      from_warehouse_id,
      to_warehouse_id,
      movement_type,
      notes,
      created_by
    )
    VALUES (
      v_asset_id,
      v_batch_id,
      v_inventory_item_type,
      v_asset_id,
      v_item.product_type,
      1,
      NULL,
      v_warehouse_id,
      'receipt',
      CONCAT('Recepción caja ', p_box_number),
      NULL
    );

    v_counter := v_counter + 1;
  END LOOP;

  RETURN QUERY SELECT v_code, v_counter, p_warehouse_code;
END;
$function$;
