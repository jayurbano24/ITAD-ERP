-- Migration 20251228: add destination warehouse column to inventory_movements

ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS to_warehouse_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_to_warehouse_id_fkey'
    ) THEN
        ALTER TABLE inventory_movements
            ADD CONSTRAINT inventory_movements_to_warehouse_id_fkey
            FOREIGN KEY (to_warehouse_id)
            REFERENCES warehouses(id)
            ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN inventory_movements.to_warehouse_id IS
    'Almacén de destino del movimiento';

-- Asegura que TK-2025-00002 tiene lote y tres activos Dell Optiplex
DO $$
DECLARE
    v_ticket_id UUID;
    v_batch_id UUID;
    v_warehouse_id UUID;
    v_asset_id UUID;
    v_serial TEXT;
    v_processed INTEGER := 0;
    v_internal_batch_id TEXT := CONCAT('AUTO-', TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'));
    v_item RECORD;
BEGIN
    SELECT id INTO v_ticket_id
    FROM operations_tickets
    WHERE readable_id = 'TK-2025-00002'
    LIMIT 1;

    IF v_ticket_id IS NULL THEN
        RAISE NOTICE 'Ticket TK-2025-00002 no encontrado; se omiten los ajustes adicionales.';
        RETURN;
    END IF;

    SELECT id INTO v_batch_id
    FROM batches
    WHERE ticket_id = v_ticket_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_batch_id IS NULL THEN
        INSERT INTO batches (
            internal_batch_id,
            ticket_id,
            status,
            expected_units,
            received_units,
            reception_date,
            pallet_count,
            created_at,
            updated_at
        )
        VALUES (
            v_internal_batch_id,
            v_ticket_id,
            'received',
            3,
            3,
            NOW(),
            1,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_batch_id;
    ELSE
        UPDATE batches
        SET status = 'received',
            expected_units = GREATEST(expected_units, 3),
            received_units = GREATEST(received_units, 3),
            reception_date = COALESCE(reception_date, NOW()),
            updated_at = NOW()
        WHERE id = v_batch_id;
    END IF;

    SELECT id INTO v_warehouse_id
    FROM warehouses
    WHERE code = 'BOD-REC'
    LIMIT 1;

    IF v_warehouse_id IS NULL THEN
        RAISE NOTICE 'No existe la bodega BOD-REC; no se puede enlazar el lote TK-2025-00002.';
        RETURN;
    END IF;

    FOR v_item IN
        SELECT id, asset_id, brand, model, product_type, collected_serial, expected_serial
        FROM ticket_items
        WHERE ticket_id = v_ticket_id
          AND (
            product_type ILIKE '%Optiplex%'
            OR product_type ILIKE '%Dell%'
            OR brand ILIKE '%Dell%'
            OR model ILIKE '%Optiplex%'
          )
        ORDER BY id
        LIMIT 3
    LOOP
        v_serial := COALESCE(v_item.collected_serial, v_item.expected_serial);

        IF v_serial IS NULL THEN
            CONTINUE;
        END IF;

        IF v_item.asset_id IS NOT NULL THEN
            v_asset_id := v_item.asset_id;
            UPDATE assets
            SET batch_id = v_batch_id,
                updated_at = NOW()
            WHERE id = v_asset_id;
        ELSE
            SELECT id INTO v_asset_id
            FROM assets
            WHERE serial_number = v_serial
            LIMIT 1;

            IF v_asset_id IS NULL THEN
                INSERT INTO assets (
                    serial_number,
                    internal_tag,
                    batch_id,
                    asset_type,
                    manufacturer,
                    model,
                    condition,
                    status,
                    location,
                    current_warehouse_id,
                    currency,
                    cost_amount,
                    specifications,
                    data_wipe_status,
                    photos,
                    created_at,
                    updated_at
                )
                VALUES (
                    v_serial,
                    CONCAT('TAG-', SUBSTRING(GEN_RANDOM_UUID()::text, 1, 8)),
                    v_batch_id,
                    COALESCE(v_item.product_type, 'Dell Optiplex'),
                    COALESCE(v_item.brand, 'Dell'),
                    COALESCE(v_item.model, 'Optiplex'),
                    'Grade B',
                    'received',
                    'BOD-REC',
                    v_warehouse_id,
                    'GTQ',
                    0,
                    '{}'::jsonb,
                    'pending',
                    ARRAY[]::text[],
                    NOW(),
                    NOW()
                )
                RETURNING id INTO v_asset_id;
            ELSE
                UPDATE assets
                SET batch_id = v_batch_id,
                    updated_at = NOW()
                WHERE id = v_asset_id;
            END IF;

            UPDATE ticket_items
            SET asset_id = v_asset_id
            WHERE id = v_item.id;
        END IF;

        v_processed := v_processed + 1;
    END LOOP;

    IF v_processed = 0 THEN
        RAISE NOTICE 'No se encontraron o vincularon activos Dell Optiplex para TK-2025-00002.';
    ELSE
        UPDATE batches
        SET received_units = GREATEST(received_units, v_processed),
            updated_at = NOW()
        WHERE id = v_batch_id;

        RAISE NOTICE 'Lote % vinculado con % activos Dell Optiplex para TK-2025-00002.', v_batch_id, v_processed;
    END IF;
END;
$$;
