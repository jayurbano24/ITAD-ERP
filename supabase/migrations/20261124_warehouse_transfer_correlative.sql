-- Secuencia atómica TRAS-000001 para traslados de bodega (evita correlativo fijo por RLS/historial incompleto).

CREATE TABLE IF NOT EXISTS warehouse_transfer_series (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO warehouse_transfer_series (id, last_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE warehouse_transfer_series ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE warehouse_transfer_series IS
    'Contador global de correlativos TRAS-XXXXXX; solo vía funciones SECURITY DEFINER.';

CREATE OR REPLACE FUNCTION sync_warehouse_transfer_series_from_history()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    max_all BIGINT;
BEGIN
  SELECT COALESCE(MAX((substring(reference_number FROM 'TRAS-([0-9]+)'))::BIGINT), 0)
    INTO max_all
  FROM inventory_movements
  WHERE reference_number ~ '^TRAS-[0-9]+$';

  UPDATE warehouse_transfer_series
  SET last_number = GREATEST(last_number, max_all),
      updated_at = now()
  WHERE id = 1;

  RETURN max_all;
END;
$$;

CREATE OR REPLACE FUNCTION peek_warehouse_transfer_correlative()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n BIGINT;
BEGIN
  PERFORM sync_warehouse_transfer_series_from_history();
  SELECT last_number + 1 INTO n FROM warehouse_transfer_series WHERE id = 1;
  IF n IS NULL THEN
    n := 1;
  END IF;
  RETURN 'TRAS-' || lpad(n::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION allocate_warehouse_transfer_correlative()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    n BIGINT;
BEGIN
  PERFORM sync_warehouse_transfer_series_from_history();

  UPDATE warehouse_transfer_series
  SET last_number = last_number + 1,
      updated_at = now()
  WHERE id = 1
  RETURNING last_number INTO n;

  IF n IS NULL THEN
    INSERT INTO warehouse_transfer_series (id, last_number)
    VALUES (1, 1)
  ON CONFLICT (id) DO UPDATE
    SET last_number = warehouse_transfer_series.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO n;
  END IF;

  RETURN 'TRAS-' || lpad(n::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION sync_warehouse_transfer_series_from_history() TO authenticated;
GRANT EXECUTE ON FUNCTION peek_warehouse_transfer_correlative() TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_warehouse_transfer_correlative() TO authenticated;

SELECT sync_warehouse_transfer_series_from_history();