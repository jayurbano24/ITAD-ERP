-- Función RPC save_box_reception (recepción de caja → BOD-REC)
-- Adaptada al esquema de producción: ticket_items brand/model, inventory_movements simplificado.

CREATE TABLE IF NOT EXISTS public.ticket_reception_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.operations_tickets(id) ON DELETE CASCADE,
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
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_warehouse_id UUID;
  v_batch_id UUID;
  v_code CHAR(4);
  v_item RECORD;
  v_asset_id UUID;
  v_ticket_reference TEXT;
  v_counter INTEGER := 0;
  v_serial TEXT;
  v_internal_tag TEXT;
  v_brand TEXT;
  v_model TEXT;
  v_color TEXT;
  v_product_type TEXT;
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

  IF lower(COALESCE(NULLIF(trim(p_item_type), ''), 'asset')) NOT IN ('asset', 'part', 'seedstock') THEN
    RAISE EXCEPTION 'Tipo de ítem % no está permitido', p_item_type;
  END IF;

  INSERT INTO ticket_reception_log (ticket_id, box_number)
  VALUES (p_ticket_id, p_box_number)
  ON CONFLICT (ticket_id, box_number) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM ticket_items
    WHERE ticket_id = p_ticket_id
      AND COALESCE(box_number, 0) = p_box_number
  ) THEN
    RAISE EXCEPTION 'No se encontraron items para la caja %', p_box_number;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ticket_items
    WHERE ticket_id = p_ticket_id
      AND COALESCE(box_number, 0) = p_box_number
      AND collected_serial IS NOT NULL
      AND trim(collected_serial) <> ''
      AND (product_type IS NULL OR trim(product_type) = '')
  ) THEN
    RAISE EXCEPTION 'Falta el Tipo de Activo en algunos ítems antes de crear los activos';
  END IF;

  SELECT box_reception_code INTO v_code
  FROM ticket_items
  WHERE ticket_id = p_ticket_id
    AND COALESCE(box_number, 0) = p_box_number
    AND box_reception_code IS NOT NULL
  LIMIT 1;

  IF v_code IS NULL THEN
    LOOP
      v_code := lpad((floor(random() * 9000 + 1000))::text, 4, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM ticket_items
        WHERE ticket_id = p_ticket_id
          AND COALESCE(box_number, 0) = p_box_number
          AND box_reception_code = v_code
      );
    END LOOP;

    UPDATE ticket_items
    SET box_reception_code = v_code
    WHERE ticket_id = p_ticket_id
      AND COALESCE(box_number, 0) = p_box_number;
  END IF;

  FOR v_item IN
    SELECT
      id,
      asset_id,
      collected_serial,
      expected_serial,
      product_type,
      brand,
      model,
      color,
      classification_f,
      classification_c,
      reception_metadata
    FROM ticket_items
    WHERE ticket_id = p_ticket_id
      AND COALESCE(box_number, 0) = p_box_number
  LOOP
  v_brand := NULLIF(trim(v_item.brand), '');
  v_model := NULLIF(trim(v_item.model), '');
  v_color := NULLIF(trim(v_item.color), '');
  v_product_type := COALESCE(NULLIF(trim(v_item.product_type), ''), 'Laptop');

  v_serial := NULLIF(trim(v_item.collected_serial), '');
  IF v_serial IS NULL THEN
    v_serial := NULLIF(trim(v_item.expected_serial), '');
  END IF;
  IF v_serial IS NULL THEN
    v_serial := 'NR-' || replace(coalesce(v_ticket_reference, 'TK'), '-', '') || '-' || substring(v_item.id::text from 1 for 8);
  END IF;

  v_spec := jsonb_strip_nulls(
    jsonb_build_object(
      'workshop_classifications',
      jsonb_strip_nulls(
        jsonb_build_object(
          'f', v_item.classification_f,
          'c', v_item.classification_c
        )
      ),
      'reception_pending_serial', CASE WHEN v_item.collected_serial IS NULL OR trim(v_item.collected_serial) = '' THEN true ELSE false END,
      'ticket_readable_id', v_ticket_reference
    )
  );

  v_asset_id := v_item.asset_id;

  IF v_asset_id IS NULL THEN
    SELECT id INTO v_asset_id
    FROM assets
    WHERE upper(trim(serial_number)) = upper(trim(v_serial))
    LIMIT 1;
  END IF;

  IF v_asset_id IS NULL THEN
    v_internal_tag := ('AST-' || upper(regexp_replace(v_serial, '[^A-Z0-9\-]', '', 'g')));

    IF char_length(v_internal_tag) > 64 THEN
      v_internal_tag := left(v_internal_tag, 64);
    END IF;

    IF v_internal_tag IS NULL OR v_internal_tag = 'AST-' THEN
      v_internal_tag := 'AST-NR-' || substring(v_item.id::text from 1 for 12);
    END IF;

    INSERT INTO assets (
      internal_tag,
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
      last_transfer_date,
      created_at,
      updated_at
    )
    VALUES (
      v_internal_tag,
      v_serial,
      v_batch_id,
      v_product_type,
      'received',
      v_warehouse_id,
      'GTQ',
      0,
      v_brand,
      v_model,
      v_color,
      CASE WHEN v_spec = '{}'::jsonb THEN NULL ELSE v_spec END,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (internal_tag) DO NOTHING
    RETURNING id INTO v_asset_id;

    IF v_asset_id IS NULL THEN
      SELECT id INTO v_asset_id
      FROM assets
      WHERE internal_tag = v_internal_tag OR upper(trim(serial_number)) = upper(trim(v_serial))
      LIMIT 1;
    END IF;

    IF v_asset_id IS NOT NULL THEN
      UPDATE assets
      SET
        batch_id = v_batch_id,
        manufacturer = COALESCE(v_brand, manufacturer),
        model = COALESCE(v_model, model),
        color = COALESCE(v_color, color),
        current_warehouse_id = v_warehouse_id,
        status = 'received',
        specifications = CASE
          WHEN v_spec IS NULL OR v_spec = '{}'::jsonb THEN specifications
          ELSE COALESCE(specifications, '{}'::jsonb) || v_spec
        END,
        last_transfer_date = NOW(),
        updated_at = NOW()
      WHERE id = v_asset_id;
    END IF;
  ELSE
    UPDATE assets
    SET
      batch_id = v_batch_id,
      manufacturer = COALESCE(v_brand, manufacturer),
      model = COALESCE(v_model, model),
      color = COALESCE(v_color, color),
      current_warehouse_id = v_warehouse_id,
      status = 'received',
      last_transfer_date = NOW(),
      updated_at = NOW()
    WHERE id = v_asset_id;
  END IF;

  IF v_asset_id IS NULL THEN
    CONTINUE;
  END IF;

  UPDATE ticket_items
  SET asset_id = v_asset_id
  WHERE id = v_item.id;

  INSERT INTO inventory_movements (
    asset_id,
    batch_id,
    from_warehouse_id,
    to_warehouse_id,
    movement_type,
    notes,
    created_at
  )
  VALUES (
    v_asset_id,
    v_batch_id,
    NULL,
    v_warehouse_id,
    'receipt',
    CONCAT('Recepción caja ', p_box_number, ' · ', coalesce(v_ticket_reference, '')),
    NOW()
  );

  v_counter := v_counter + 1;
  END LOOP;

  UPDATE batches
  SET
    received_units = GREATEST(COALESCE(received_units, 0), v_counter),
    status = 'received',
    reception_date = COALESCE(reception_date, NOW()),
    updated_at = NOW()
  WHERE id = v_batch_id;

  RETURN QUERY SELECT v_code, v_counter, p_warehouse_code;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_box_reception(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_box_reception(UUID, INTEGER, TEXT, TEXT) TO service_role;